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
import {
  getUserConfigPath,
  getDefaultConfigPath,
  configExists,
  copyDefaultToUser,
} from '../utils/xdgPaths.js'

// ========================================
// Zod Schemas
// ========================================

/** Position schema (allows negative values for physical buttons) */
const PositionSchema = z.object({
  col: z.number().int().max(4),
  row: z.number().int().max(2),
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
  label: z.string().optional(),
  iconType: z.enum(['none', 'nerdfont', 'auto', 'image']).optional(),
  icon: z.string().optional(),
  iconImage: z.string().optional(),
  iconSize: z.number().optional(),
  bgColor: z.string(),
  borderColor: z.string(),
  textColor: z.string(),
  hoverBgColor: z.string().optional(),
  vibrationPattern: VibrationPatternSchema.optional(),
  ledColor: z.string().optional(),
})

/** Button component schema */
const ButtonComponentSchema = z.object({
  type: z.literal('button'),
  position: PositionSchema,
  appName: z.string().optional(),
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
const PageSchema = z.record(
  z.string(),
  z.union([
    z.object({ title: z.string(), description: z.string() }), // _meta
    ComponentSchema, // コンポーネント
  ])
)

/** Root configuration schema */
export const ConfigSchema = z.object({
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
 * @param configPath - Path to config.json (defaults to XDG path)
 * @returns Validated configuration object
 */
export function loadConfig(configPath?: string): Config {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig
  }

  // Resolve config path (use XDG path if not specified)
  let resolvedPath = configPath
  if (!resolvedPath) {
    // Initialize user config if it doesn't exist
    if (!configExists()) {
      logger.info('初回実行: デフォルト設定をコピーします...')
      copyDefaultToUser()
      const userPath = getUserConfigPath()
      logger.info(`✓ 設定ファイルを作成しました: ${userPath}`)
    }
    resolvedPath = getUserConfigPath()
  }

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
      const errors = (error as any).errors
      logger.error(`Errors type: ${typeof errors}, is array: ${Array.isArray(errors)}`)
      if (errors && Array.isArray(errors)) {
        errors.forEach((err: any) => {
          logger.error(`  - ${err.path?.join('.') || 'unknown'}: ${err.message}`)
        })
      } else {
        logger.error(`Error object: ${JSON.stringify(error, null, 2)}`)
      }
      throw new Error('Invalid configuration file')
    }

    if (error instanceof Error) {
      logger.error(`Failed to load configuration: ${error.message}`)
      logger.error(`Error stack: ${error.stack}`)
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
export function convertToPageConfig(config: Config): Record<
  number,
  {
    meta: PageMeta
    components: Record<string, Component>
  }
> {
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
 * @param configPath - Path to config.json (defaults to XDG path)
 * @param onReload - Callback function called when config is reloaded
 */
export function watchConfig(configPath?: string, onReload?: () => void): void {
  const resolvedPath = configPath || getUserConfigPath()

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

/**
 * 設定ファイルから物理ボタン（button0-3）の設定を抽出する
 *
 * @param config - 設定オブジェクト
 * @returns ボタンID (0-3) をキーとするボタン設定のマップ
 */
export function extractPhysicalButtonConfigs(config: Config): Map<number, Record<string, unknown>> {
  const buttonMap = new Map<number, Record<string, unknown>>()
  const page1 = config.pages?.['1']

  if (!page1) return buttonMap

  // button0-3を検索
  for (let i = 0; i < 4; i++) {
    const buttonKey = `button${i}`
    const buttonConfig = page1[buttonKey]

    if (buttonConfig && typeof buttonConfig === 'object' && 'type' in buttonConfig) {
      buttonMap.set(i, buttonConfig as Record<string, unknown>)
    }
  }

  return buttonMap
}

// Default LED colors for physical buttons (fallback when not set in config.json)
const DEFAULT_LED_COLORS: Record<number, string> = {
  0: '#FFFFFF', // White
  1: '#FF0000', // Red
  2: '#00FF00', // Green
  3: '#0000FF', // Blue
}

/**
 * Extract LED colors for physical buttons from config
 * Uses DEFAULT_LED_COLORS as fallback when ledColor is not set
 *
 * @param config - Configuration object
 * @returns Record mapping button IDs to LED colors
 */
export function extractLedColors(config: Config): Record<number, string> {
  const physicalButtonConfigs = extractPhysicalButtonConfigs(config)
  const ledColors: Record<number, string> = {}

  for (const [buttonId, buttonConfig] of physicalButtonConfigs.entries()) {
    const options = buttonConfig.options as { ledColor?: string }
    ledColors[buttonId] = options.ledColor || DEFAULT_LED_COLORS[buttonId] || '#FFFFFF'
  }

  return ledColors
}
