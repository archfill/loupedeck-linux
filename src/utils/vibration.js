import { logger } from './logger.js'

/**
 * 振動パターン定義
 * 配列の各要素は振動時間（ミリ秒）を表す
 * 奇数番目: 振動ON、偶数番目: 振動OFF
 */
export const VibrationPatterns = {
  // 短いタップ - ボタン押下時
  tap: [30],

  // ダブルタップ - 確認アクション
  doubleTap: [30, 50, 30],

  // 成功 - アプリ起動成功など
  success: [50, 80, 50],

  // エラー - 失敗時
  error: [200],

  // 警告 - 注意が必要な時
  warning: [100, 80, 100],

  // 接続 - デバイス接続時
  connect: [30, 50, 50, 50, 70],

  // 長押し - 特殊な操作
  longPress: [150],

  // 通知 - 何かを知らせる時
  notification: [50, 100, 50, 100, 50],
}

/**
 * 振動ユーティリティクラス
 */
export class VibrationUtil {
  constructor(device) {
    this.device = device
    this.enabled = true
  }

  /**
   * 振動を実行
   * @param {Array<number>} pattern - 振動パターン
   */
  async vibrate(pattern) {
    if (!this.enabled || !this.device) {
      return
    }

    try {
      await this.device.vibrate(pattern)
      logger.debug(`振動実行: [${pattern.join(', ')}]`)
    } catch (error) {
      logger.warn(`振動の実行に失敗しました: ${error.message}`)
    }
  }

  /**
   * 定義済みパターンで振動
   * @param {string} patternName - パターン名（'tap', 'success', 'error'など）
   */
  async vibratePattern(patternName) {
    const pattern = VibrationPatterns[patternName]
    if (!pattern) {
      logger.warn(`未定義の振動パターン: ${patternName}`)
      return
    }

    await this.vibrate(pattern)
  }

  /**
   * 振動の有効/無効を切り替え
   * @param {boolean} enabled - 有効にするか
   */
  setEnabled(enabled) {
    this.enabled = enabled
    logger.info(`振動: ${enabled ? '有効' : '無効'}`)
  }

  /**
   * 振動が有効かどうか
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled
  }
}

export default VibrationUtil
