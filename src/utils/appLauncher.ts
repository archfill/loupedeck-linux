import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from './logger.ts'
import { VIBRATION_PATTERNS } from '../config/constants.ts'
import type { VibrationUtil } from './vibration.ts'

const execAsync = promisify(exec)

/**
 * アプリケーション起動ユーティリティ
 */
export class AppLauncher {
  private vibration: VibrationUtil | null

  /**
   * @param vibration - 振動ユーティリティ（オプショナル）
   */
  constructor(vibration: VibrationUtil | null = null) {
    this.vibration = vibration
  }

  /**
   * アプリケーションを起動
   * @param appName - 起動するアプリケーション名またはコマンド
   */
  async launch(appName: string): Promise<void> {
    logger.info(`${appName} を起動中...`)

    // 環境変数の確認（デバッグ用）
    const display = process.env.DISPLAY
    const xauthority = process.env.XAUTHORITY
    const waylandDisplay = process.env.WAYLAND_DISPLAY

    if (!display && !waylandDisplay) {
      logger.warn(
        'DISPLAYまたはWAYLAND_DISPLAY環境変数が設定されていません。GUIアプリの起動に失敗する可能性があります。'
      )
      logger.debug('環境変数:')
      logger.debug({
        DISPLAY: display,
        XAUTHORITY: xauthority,
        WAYLAND_DISPLAY: waylandDisplay,
        XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR,
        DBUS_SESSION_BUS_ADDRESS: process.env.DBUS_SESSION_BUS_ADDRESS,
      })
    }

    try {
      // setsidでプロセスをデタッチして、親プロセス終了時も継続するようにする
      // 環境変数を明示的に渡す
      const env = { ...process.env }
      await execAsync(`setsid ${appName} >/dev/null 2>&1 &`, { env })
      logger.info(`✓ ${appName} を起動しました`)

      // 成功時の振動フィードバック
      if (this.vibration) {
        await this.vibration.vibratePattern(VIBRATION_PATTERNS.SUCCESS)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`✗ ${appName} の起動に失敗しました: ${message}`)

      // 失敗時の振動フィードバック
      if (this.vibration) {
        await this.vibration.vibratePattern(VIBRATION_PATTERNS.ERROR)
      }

      throw error
    }
  }
}
