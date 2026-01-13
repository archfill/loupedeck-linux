import path from 'path'
import os from 'os'
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * XDG Base Directory Specification に準拠した設定パスを管理するユーティリティ
 */

/**
 * XDG_CONFIG_HOME 環境変数を取得
 * 未設定の場合は ~/.config を返す
 */
export function getXDGConfigHome(): string {
  return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')
}

/**
 * ユーザー設定ディレクトリパスを取得
 * @returns {string} ~/.config/loupedeck-linux
 */
export function getConfigDirectory(): string {
  return path.join(getXDGConfigHome(), 'loupedeck-linux')
}

/**
 * ユーザー設定ファイルパスを取得
 * @returns {string} ~/.config/loupedeck-linux/config.json
 */
export function getUserConfigPath(): string {
  return path.join(getConfigDirectory(), 'config.json')
}

/**
 * デフォルト設定ファイルパスを取得
 * @returns {string} プロジェクト内の apps/backend/config/config.default.json
 */
export function getDefaultConfigPath(): string {
  // esbuild バンドル後は __dirname が apps/backend/dist になる
  // 開発時は __dirname が apps/backend/src/utils になる
  // どちらの場合も ../../../../ でプロジェクトルートに戻れる
  const projectRoot = process.env.LOUPEDECK_PROJECT_ROOT || path.resolve(__dirname, '../../../../')
  return path.join(projectRoot, 'apps/backend/config/config.default.json')
}

/**
 * ユーザー設定ファイルが存在するか確認
 * @returns {boolean}
 */
export function configExists(): boolean {
  return existsSync(getUserConfigPath())
}

/**
 * 設定ディレクトリを作成（既存の場合は何もしない）
 */
export function ensureConfigDirectory(): void {
  const configDir = getConfigDirectory()
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }
}

/**
 * デフォルト設定をユーザー設定にコピー
 */
export function copyDefaultToUser(): void {
  ensureConfigDirectory()
  const defaultPath = getDefaultConfigPath()
  const userPath = getUserConfigPath()

  if (!existsSync(defaultPath)) {
    throw new Error(`デフォルト設定ファイルが見つかりません: ${defaultPath}`)
  }

  copyFileSync(defaultPath, userPath)
}
