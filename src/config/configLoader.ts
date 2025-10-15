/**
 * Configuration Loader
 *
 * Loads and validates configuration from JSON file using Zod schemas
 */

import { z } from 'zod'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { watch, type FSWatcher } from 'chokidar'
import { logger } from '../utils/logger.js'

// ========================================
// Zod Schemas
// ========================================

/** Position schema */
const PositionSchema = z.object({
  col: z.number().int().min(0).max(4),
  row: z.number().int().min(0).max(2),
})

/** Vibration pattern schema */
const VibrationPatternSchema = z.enum(['tap', 'success', 'error', 'warning', 'connect'])

/** Clock options schema */
const ClockOptionsSchema = z.object({
  cellBgColor: z.string(),
  cellBorderColor: z.string(),
  timeColor: z.string(),
  dateColor: z.string(),
  showSeconds: z.boolean(),
})

/** Clock component schema */
const ClockComponentSchema = z.object({
  type: z.literal('clock'),
  position: PositionSchema,
  options: ClockOptionsSchema,
})

/** Button options schema */
const ButtonOptionsSchema = z.object({
  label: z.string(),
  icon: z.string().optional(),
  iconSize: z.number(),
  bgColor: z.string(),
  borderColor: z.string(),
  textColor: z.string(),
  hoverBgColor: z.string(),
  vibrationPattern: VibrationPatternSchema,
})

/** Button component schema */
const ButtonComponentSchema = z.object({
  type: z.literal('button'),
  position: PositionSchema,
  appName: z.string(),
  options: ButtonOptionsSchema,
  command: z.string(),
})

/** Volume display options schema */
const VolumeDisplayOptionsSchema = z.object({
  cellBgColor: z.string(),
  cellBorderColor: z.string(),
  barFillColor: z.string(),
})

/** Volume display component schema */
const VolumeDisplayComponentSchema = z.object({
  type: z.literal('volumeDisplay'),
  position: PositionSchema,
  options: VolumeDisplayOptionsSchema,
})

/** Media display options schema */
const MediaDisplayOptionsSchema = z.object({
  cellBgColor: z.string(),
  cellBorderColor: z.string(),
  titleColor: z.string(),
  artistColor: z.string(),
  statusColor: z.string(),
  iconColor: z.string(),
})

/** Media display component schema */
const MediaDisplayComponentSchema = z.object({
  type: z.literal('mediaDisplay'),
  position: PositionSchema,
  options: MediaDisplayOptionsSchema,
})

/** Layout component schema (for page 2 workspace buttons) */
const LayoutComponentSchema = z.object({
  type: z.literal('layout'),
  position: PositionSchema,
  options: z.object({
    label: z.string(),
  }),
})

/** Union of all component schemas */
const ComponentSchema = z.discriminatedUnion('type', [
  ClockComponentSchema,
  ButtonComponentSchema,
  VolumeDisplayComponentSchema,
  MediaDisplayComponentSchema,
  LayoutComponentSchema,
])

/** Page metadata schema */
const PageMetaSchema = z.object({
  title: z.string(),
  description: z.string(),
})

/** Page schema - フラット構造（_metaとコンポーネントが同じレベル） */
const PageSchema = z.record(z.string(), z.union([
  z.object({ title: z.string(), description: z.string() }), // _meta
  ComponentSchema, // コンポーネント
]))

/** Root configuration schema */
const ConfigSchema = z.object({
  pages: z.record(z.string(), PageSchema),
})

// ========================================
// Type Exports (inferred from Zod schemas)
// ========================================

export type Position = z.infer<typeof PositionSchema>
export type VibrationPattern = z.infer<typeof VibrationPatternSchema>

export type ClockOptions = z.infer<typeof ClockOptionsSchema>
export type ClockComponent = z.infer<typeof ClockComponentSchema>

export type ButtonOptions = z.infer<typeof ButtonOptionsSchema>
export type ButtonComponent = z.infer<typeof ButtonComponentSchema>

export type VolumeDisplayOptions = z.infer<typeof VolumeDisplayOptionsSchema>
export type VolumeDisplayComponent = z.infer<typeof VolumeDisplayComponentSchema>

export type MediaDisplayOptions = z.infer<typeof MediaDisplayOptionsSchema>
export type MediaDisplayComponent = z.infer<typeof MediaDisplayComponentSchema>

export type LayoutComponent = z.infer<typeof LayoutComponentSchema>

export type Component = z.infer<typeof ComponentSchema>
export type PageMeta = z.infer<typeof PageMetaSchema>
export type Page = Record<string, PageMeta | Component>
export type Config = z.infer<typeof ConfigSchema>

// ========================================
// Configuration Loader
// ========================================

let cachedConfig: Config | null = null
let watcher: FSWatcher | null = null
let reloadCallback: (() => void) | null = null

/**
 * Load configuration from JSON file
 *
 * @param configPath - Path to config.json (defaults to config/config.json)
 * @returns Validated configuration object
 */
export function loadConfig(configPath?: string): Config {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig
  }

  // Resolve config path
  const resolvedPath = configPath || resolve(process.cwd(), 'config/config.json')

  try {
    // Read JSON file
    const jsonContent = readFileSync(resolvedPath, 'utf-8')
    const rawConfig = JSON.parse(jsonContent)

    // Validate with Zod
    const validatedConfig = ConfigSchema.parse(rawConfig)

    // Cache and return
    cachedConfig = validatedConfig
    logger.info(`✓ Configuration loaded from ${resolvedPath}`)
    return validatedConfig
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Configuration validation failed:')
      error.errors.forEach((err) => {
        logger.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      throw new Error('Invalid configuration file')
    }

    if (error instanceof Error) {
      logger.error(`Failed to load configuration: ${error.message}`)
    }

    throw error
  }
}

/**
 * Clear cached configuration (useful for testing or hot reload)
 */
export function clearConfigCache(): void {
  cachedConfig = null
}

/**
 * Convert loaded JSON config to the format expected by pages.ts
 *
 * This bridges the gap between JSON storage and TypeScript interfaces
 */
export function convertToPageConfig(config: Config): Record<number, {
  meta: PageMeta
  components: Record<string, Component>
}> {
  const result: Record<number, { meta: PageMeta; components: Record<string, Component> }> = {}

  Object.entries(config.pages).forEach(([pageNum, pageData]) => {
    // フラット構造から meta と components を分離
    const meta = pageData._meta as PageMeta
    const components: Record<string, Component> = {}

    Object.entries(pageData).forEach(([key, value]) => {
      if (key !== '_meta') {
        components[key] = value as Component
      }
    })

    result[Number(pageNum)] = {
      meta,
      components,
    }
  })

  return result
}

/**
 * Start watching config file for changes and reload automatically
 *
 * @param configPath - Path to config.json
 * @param onReload - Callback function called when config is reloaded
 */
export function watchConfig(configPath?: string, onReload?: () => void): void {
  const resolvedPath = configPath || resolve(process.cwd(), 'config/config.json')

  if (watcher) {
    logger.warn('Config watcher already running')
    return
  }

  reloadCallback = onReload || null

  watcher = watch(resolvedPath, {
    persistent: true,
    ignoreInitial: true,
  })

  watcher.on('change', (path) => {
    logger.info(`📝 Config file changed: ${path}`)
    logger.info('🔄 Reloading configuration...')

    try {
      // Clear cache
      clearConfigCache()

      // Reload config
      loadConfig(resolvedPath)

      logger.info('✓ Configuration reloaded successfully')

      // Call reload callback if provided
      if (reloadCallback) {
        reloadCallback()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`Failed to reload configuration: ${message}`)
    }
  })

  watcher.on('error', (error) => {
    logger.error(`Config watcher error: ${error}`)
  })

  logger.info(`👀 Watching config file for changes: ${resolvedPath}`)
}

/**
 * Stop watching config file
 */
export async function stopWatchingConfig(): Promise<void> {
  if (watcher) {
    await watcher.close()
    watcher = null
    reloadCallback = null
    logger.info('Config watcher stopped')
  }
}
