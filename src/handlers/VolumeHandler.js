import { logger } from '../utils/logger.js'
import { KNOB_IDS, VOLUME_STEP_PERCENT, VIBRATION_PATTERNS } from '../config/constants.js'

/**
 * 音量制御イベントハンドラー
 * ノブの回転とクリックによる音量調整とミュート切り替えを処理
 */
export class VolumeHandler {
  /**
   * @param {VolumeControl} volumeControl - 音量制御インスタンス
   * @param {VolumeDisplay} volumeDisplay - 音量表示コンポーネント
   * @param {GridLayout} layout - グリッドレイアウト
   * @param {VibrationUtil} vibration - 振動ユーティリティ（オプショナル）
   */
  constructor(volumeControl, volumeDisplay, layout, vibration = null) {
    this.volumeControl = volumeControl
    this.volumeDisplay = volumeDisplay
    this.layout = layout
    this.vibration = vibration
  }

  /**
   * ノブ回転イベントを処理（音量調整）
   * @param {string} id - ノブID
   * @param {number} delta - 回転量（-1 または +1）
   */
  async handleRotate(id, delta) {
    logger.info(`🔄 ノブ ${id} 回転: ${delta > 0 ? '+' : ''}${delta}`)

    // knobTL（左上のノブ）のみを音量調整に使用
    if (id === KNOB_IDS.TOP_LEFT) {
      // delta値に基づいて音量を調整（通常 -1 または +1）
      const step = delta * VOLUME_STEP_PERCENT
      const newVolume = await this.volumeControl.adjustVolume(step)

      logger.info(`🔊 音量を調整: ${newVolume}%`)

      // 音量表示を一時的に表示し、振動フィードバックを実行
      await this.showVolumeWithFeedback(VIBRATION_PATTERNS.TAP)
    }
  }

  /**
   * ノブクリックイベントを処理（ミュート切り替え）
   * @param {string} id - ノブID
   */
  async handleDown(id) {
    // knobTL（左上のノブ）クリックでミュート切り替え
    if (id === KNOB_IDS.TOP_LEFT) {
      logger.info('🔘 ノブ knobTL クリック - ミュート切り替え')

      // ミュート切り替え
      const isMuted = await this.volumeControl.toggleMute()

      // ミュート状態に応じた振動パターンで表示
      const pattern = isMuted ? VIBRATION_PATTERNS.WARNING : VIBRATION_PATTERNS.SUCCESS
      await this.showVolumeWithFeedback(pattern)

      logger.info(`🔇 ミュート状態: ${isMuted ? 'ON' : 'OFF'}`)
    }
  }

  /**
   * 音量表示を一時的に表示し、振動フィードバックと画面更新を実行
   * @param {string} pattern - 振動パターン名
   */
  async showVolumeWithFeedback(pattern = VIBRATION_PATTERNS.TAP) {
    // 音量表示を一時的に表示（2秒間）
    this.volumeDisplay.showTemporarily()

    // 振動フィードバック
    if (this.vibration) {
      await this.vibration.vibratePattern(pattern)
    }

    // 画面を即座に更新して新しい音量を表示
    await this.layout.update()
  }
}
