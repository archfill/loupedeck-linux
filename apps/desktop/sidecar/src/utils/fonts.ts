import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { registerFont } from 'canvas'

export const UI_FONT_FAMILY = 'LoupedeckUI'
export const ICON_FONT_FAMILY = 'LoupedeckIcons'

let registered = false

function fcMatchFile(family: string): string | null {
  try {
    const output = execFileSync('fc-match', ['-v', family], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const match = output.match(/file:\s+"([^"]+)"/)
    return match?.[1] && existsSync(match[1]) ? match[1] : null
  } catch {
    return null
  }
}

function resolveFontPath(envName: string, family: string): string | null {
  const envPath = process.env[envName]
  if (envPath && existsSync(envPath)) {
    return envPath
  }
  return fcMatchFile(family)
}

function registerFontIfAvailable(path: string | null, family: string): void {
  if (!path) {
    return
  }

  try {
    registerFont(path, { family })
  } catch {
    // Font fallback still works if registration fails; avoid noisy device logs.
  }
}

export function registerCanvasFonts(): void {
  if (registered) {
    return
  }
  registered = true

  registerFontIfAvailable(
    resolveFontPath('LOUPEDECK_UI_FONT_PATH', 'Noto Sans CJK JP'),
    UI_FONT_FAMILY
  )
  registerFontIfAvailable(
    resolveFontPath('LOUPEDECK_ICON_FONT_PATH', 'Symbols Nerd Font'),
    ICON_FONT_FAMILY
  )
}
