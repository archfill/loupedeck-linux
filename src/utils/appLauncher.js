import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from './logger.js'
import { VIBRATION_PATTERNS } from '../config/constants.js'

const execAsync = promisify(exec)

/**
 * アプリケーション起動ユーティリティ
 */
export class AppLauncher {
  /**
   * @param {VibrationUtil} vibration - 振動ユーティリティ（オプショナル）
   */
  constructor(vibration = null) {
    this.vibration = vibration
  }

  /**
   * アプリケーションを起動
   * @param {string} appName - 起動するアプリケーション名またはコマンド
   * @returns {Promise<void>}
   */
  async launch(appName) {
    logger.info(`${appName} を起動中...`)

    try {
      await execAsync(appName)
      logger.info(`✓ ${appName} を起動しました`)

      // 成功時の振動フィードバック
      if (this.vibration) {
        await this.vibration.vibratePattern(VIBRATION_PATTERNS.SUCCESS)
      }
    } catch (error) {
      logger.error(`✗ ${appName} の起動に失敗しました: ${error.message}`)

      // 失敗時の振動フィードバック
      if (this.vibration) {
        await this.vibration.vibratePattern(VIBRATION_PATTERNS.ERROR)
      }

      throw error
    }
  }
}
