import { logger } from '../utils/logger.js'
import { KNOB_IDS, VIBRATION_PATTERNS, type VibrationPattern } from '../config/constants.ts'

/**
 * メディア制御イベントハンドラー
 * ノブの回転とクリックによるメディア操作を処理
 */
export class MediaHandler {
  private mediaControl: any // TODO: MediaControl型を定義
  private mediaDisplay: any // TODO: MediaDisplay型を定義
  private layout: any // TODO: GridLayout型を定義
  private vibration: any | null // TODO: VibrationUtil型を定義

  /**
   * @param mediaControl - メディア制御インスタンス
   * @param mediaDisplay - メディア表示コンポーネント
   * @param layout - グリッドレイアウト
   * @param vibration - 振動ユーティリティ（オプショナル）
   */
  constructor(mediaControl: any, mediaDisplay: any, layout: any, vibration: any = null) {
    this.mediaControl = mediaControl
    this.mediaDisplay = mediaDisplay
    this.layout = layout
    this.vibration = vibration
  }

  /**
   * ノブ回転イベントを処理（トラック移動）
   * @param id - ノブID
   * @param delta - 回転量（-1 または +1）
   */
  async handleRotate(id: string, delta: number): Promise<void> {
    logger.info(`🔄 ノブ ${id} 回転: ${delta > 0 ? '+' : ''}${delta}`)

    // knobCL（中央左のノブ）をメディア操作に使用
    if (id === KNOB_IDS.CENTER_LEFT) {
      if (delta > 0) {
        // 時計回り：次のトラック
        await this.mediaControl.next()
        logger.info('🎵 次のトラック')
      } else {
        // 反時計回り：前のトラック
        await this.mediaControl.previous()
        logger.info('🎵 前のトラック')
      }

      // メディア表示を一時的に表示し、振動フィードバックを実行
      await this.showMediaWithFeedback(VIBRATION_PATTERNS.TAP)
    }
  }

  /**
   * ノブクリックイベントを処理（再生/一時停止切り替え）
   * @param id - ノブID
   */
  async handleDown(id: string): Promise<void> {
    // knobCL（中央左のノブ）クリックで再生/一時停止切り替え
    if (id === KNOB_IDS.CENTER_LEFT) {
      logger.info('🔘 ノブ knobCL クリック - 再生/一時停止切り替え')

      // 再生/一時停止切り替え
      const status = await this.mediaControl.togglePlayPause()

      // 状態に応じた振動パターンで表示
      const pattern = status === 'Playing' ? VIBRATION_PATTERNS.SUCCESS : VIBRATION_PATTERNS.WARNING
      await this.showMediaWithFeedback(pattern)

      logger.info(`🎵 状態: ${status}`)
    }
  }

  /**
   * メディア表示を一時的に表示し、振動フィードバックと画面更新を実行
   * @param pattern - 振動パターン名
   */
  private async showMediaWithFeedback(
    pattern: VibrationPattern = VIBRATION_PATTERNS.TAP
  ): Promise<void> {
    // メディア表示を一時的に表示（2秒間）
    this.mediaDisplay.showTemporarily()

    // 振動フィードバック
    if (this.vibration) {
      await this.vibration.vibratePattern(pattern)
    }

    // 画面を即座に更新して新しいメディア情報を表示
    await this.layout.update()
  }
}
