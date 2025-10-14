import { logger } from '../utils/logger.js'
import {
  KNOB_IDS,
  VOLUME_STEP_PERCENT,
  VIBRATION_PATTERNS,
  type VibrationPattern,
} from '../config/constants.ts'

/**
 * 音量制御イベントハンドラー
 * ノブの回転とクリックによる音量調整とミュート切り替えを処理
 */
export class VolumeHandler {
  private volumeControl: any // TODO: VolumeControl型を定義
  private volumeDisplay: any // TODO: VolumeDisplay型を定義
  private layout: any // TODO: GridLayout型を定義
  private vibration: any | null // TODO: VibrationUtil型を定義

  /**
   * @param volumeControl - 音量制御インスタンス
   * @param volumeDisplay - 音量表示コンポーネント
   * @param layout - グリッドレイアウト
   * @param vibration - 振動ユーティリティ（オプショナル）
   */
  constructor(volumeControl: any, volumeDisplay: any, layout: any, vibration: any = null) {
    this.volumeControl = volumeControl
    this.volumeDisplay = volumeDisplay
    this.layout = layout
    this.vibration = vibration
  }

  /**
   * ノブ回転イベントを処理（音量調整）
   * @param id - ノブID
   * @param delta - 回転量（-1 または +1）
   */
  async handleRotate(id: string, delta: number): Promise<void> {
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
   * @param id - ノブID
   */
  async handleDown(id: string): Promise<void> {
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
   * @param pattern - 振動パターン名
   */
  private async showVolumeWithFeedback(
    pattern: VibrationPattern = VIBRATION_PATTERNS.TAP
  ): Promise<void> {
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
