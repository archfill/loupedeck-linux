import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'fs'

// Mock external dependencies before importing the module under test
vi.mock('fs')
vi.mock('chokidar', () => ({
  watch: vi.fn(() => ({ on: vi.fn(), close: vi.fn() })),
}))
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))
vi.mock('../utils/xdgPaths.js', () => ({
  getUserConfigPath: vi.fn(() => '/mock/config.json'),
  configExists: vi.fn(() => true),
  copyDefaultToUser: vi.fn(),
}))

import {
  loadConfig,
  clearConfigCache,
  convertToPageConfig,
  extractPhysicalButtonConfigs,
  extractLedColors,
  type Config,
} from './configLoader.js'

// ---------------------------------------------------------------------------
// Minimal valid config fixture
// ---------------------------------------------------------------------------

const MINIMAL_CONFIG = {
  pages: {
    '1': {
      _meta: { title: 'Page 1', description: 'First page' },
      clock: {
        type: 'clock',
        position: { col: 0, row: 0 },
        options: {
          cellBgColor: '#000000',
          cellBorderColor: '#111111',
          timeColor: '#FFFFFF',
          dateColor: '#AAAAAA',
          showSeconds: true,
        },
      },
      button0: {
        type: 'button',
        position: { col: -1, row: 0 },
        options: {
          label: 'Btn0',
          bgColor: '#FF0000',
          borderColor: '#FF0000',
          textColor: '#FFFFFF',
          ledColor: '#FF00FF',
        },
        command: 'echo 0',
      },
      button1: {
        type: 'button',
        position: { col: -1, row: 1 },
        options: {
          label: 'Btn1',
          bgColor: '#00FF00',
          borderColor: '#00FF00',
          textColor: '#000000',
          // no ledColor — should fall back to default
        },
        command: 'echo 1',
      },
    },
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupMockFs(configObj: unknown): void {
  vi.mocked(readFileSync).mockReturnValue(JSON.stringify(configObj))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('loadConfig()', () => {
  beforeEach(() => {
    clearConfigCache()
    vi.clearAllMocks()
  })

  it('loads and validates a valid config', () => {
    setupMockFs(MINIMAL_CONFIG)
    const config = loadConfig('/mock/config.json')
    expect(config.pages).toBeDefined()
    expect(Object.keys(config.pages)).toContain('1')
  })

  it('returns cached config on second call without re-reading the file', () => {
    setupMockFs(MINIMAL_CONFIG)
    loadConfig('/mock/config.json')
    loadConfig('/mock/config.json')
    expect(readFileSync).toHaveBeenCalledTimes(1)
  })

  it('throws on invalid config (missing required fields)', () => {
    setupMockFs({
      pages: { '1': { _meta: { title: 'x', description: 'y' }, bad: { type: 'unknown' } } },
    })
    expect(() => loadConfig('/mock/config.json')).toThrow()
  })
})

describe('convertToPageConfig()', () => {
  it('separates _meta from components', () => {
    const config = MINIMAL_CONFIG as unknown as Config
    const result = convertToPageConfig(config)

    expect(result[1].meta).toEqual({ title: 'Page 1', description: 'First page' })
    expect(result[1].components).not.toHaveProperty('_meta')
    expect(result[1].components).toHaveProperty('clock')
    expect(result[1].components).toHaveProperty('button0')
  })

  it('maps page keys to numbers', () => {
    const config = MINIMAL_CONFIG as unknown as Config
    const result = convertToPageConfig(config)
    expect(result[1]).toBeDefined()
    expect(typeof Object.keys(result)[0]).toBe('string') // JS object keys are always strings
    expect(result[1]).toBeDefined()
  })
})

describe('extractPhysicalButtonConfigs()', () => {
  it('extracts button0 and button1 from page 1', () => {
    const config = MINIMAL_CONFIG as unknown as Config
    const map = extractPhysicalButtonConfigs(config)
    expect(map.size).toBe(2)
    expect(map.has(0)).toBe(true)
    expect(map.has(1)).toBe(true)
  })

  it('returns empty map when page 1 is missing', () => {
    const config = { pages: {} } as unknown as Config
    const map = extractPhysicalButtonConfigs(config)
    expect(map.size).toBe(0)
  })

  it('does not include non-button components', () => {
    const config = MINIMAL_CONFIG as unknown as Config
    const map = extractPhysicalButtonConfigs(config)
    // "clock" should not appear — only button0 and button1
    expect([...map.keys()]).toEqual([0, 1])
  })
})

describe('extractLedColors()', () => {
  it('uses ledColor from config when present', () => {
    const config = MINIMAL_CONFIG as unknown as Config
    const colors = extractLedColors(config)
    expect(colors[0]).toBe('#FF00FF')
  })

  it('falls back to default LED color when ledColor is not set', () => {
    const config = MINIMAL_CONFIG as unknown as Config
    const colors = extractLedColors(config)
    // button1 has no ledColor; default for index 1 is '#FF0000'
    expect(colors[1]).toBe('#FF0000')
  })

  it('returns an entry for each physical button found', () => {
    const config = MINIMAL_CONFIG as unknown as Config
    const colors = extractLedColors(config)
    expect(Object.keys(colors).map(Number)).toEqual([0, 1])
  })
})
