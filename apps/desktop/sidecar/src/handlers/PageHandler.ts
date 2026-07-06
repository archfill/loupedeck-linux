import { logger } from '../utils/logger.js'
import { KNOB_IDS, VIBRATION_PATTERNS } from '../config/constants.ts'
import type { GridLayout } from '../components/GridLayout.ts'
import type { VibrationUtil } from '../utils/vibration.ts'

/**
 * ページ切替イベントハンドラー
 * ノブの回転とクリックによるページ切り替えを処理
 */
export class PageHandler {
  private layout: GridLayout
  private vibration: VibrationUtil | null

  /**
   * @param layout - グリッドレイアウト
   * @param vibration - 振動ユーティリティ（オプショナル）
   */
  constructor(layout: GridLayout, vibration: VibrationUtil | null = null) {
    this.layout = layout
    this.vibration = vibration
  }

  /**
   * ノブ回転イベントを処理（ページ切替）
   * @param id - ノブID
   * @param delta - 回転量（-1 または +1）
   */
  async handleRotate(id: string, delta: number): Promise<void> {
    logger.info(`🔄 ノブ ${id} 回転: ${delta > 0 ? '+' : ''}${delta}`)

    // knobCL（中央左のノブ）をページ切替に使用
    if (id === KNOB_IDS.CENTER_LEFT) {
      const pages = this.layout.getAllPages()
      if (pages.length <= 1) {
        logger.info('切り替え可能なページがありません')
        if (this.vibration) {
          await this.vibration.vibratePattern(VIBRATION_PATTERNS.WARNING)
        }
        return
      }

      const currentPage = this.layout.getCurrentPage()
      const currentIndex = Math.max(0, pages.indexOf(currentPage))
      const direction = delta > 0 ? 1 : -1
      const targetIndex = (currentIndex + direction + pages.length) % pages.length
      const targetPage = pages[targetIndex] ?? pages[0]!

      if (delta > 0) {
        logger.info(`📄 次のページ: ${targetPage}`)
      } else {
        logger.info(`📄 前のページ: ${targetPage}`)
      }

      try {
        // ページを切り替え
        await this.layout.switchPage(targetPage)

        // 振動フィードバック
        if (this.vibration) {
          await this.vibration.vibratePattern(VIBRATION_PATTERNS.TAP)
        }

        logger.info(`✓ ページ ${targetPage} に切り替えました`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error(`ページ切り替えに失敗: ${message}`)
        if (this.vibration) {
          await this.vibration.vibratePattern(VIBRATION_PATTERNS.ERROR)
        }
      }
    }
  }

  /**
   * ノブクリックイベントを処理（ページ1に戻る）
   * @param id - ノブID
   */
  async handleDown(id: string): Promise<void> {
    // knobCL（中央左のノブ）クリックでページ1に戻る
    if (id === KNOB_IDS.CENTER_LEFT) {
      logger.info('🔘 ノブ knobCL クリック - ページ1に戻る')

      const firstPage = this.layout.getAllPages()[0] ?? 1
      const currentPage = this.layout.getCurrentPage()
      if (currentPage === firstPage) {
        logger.info(`既にページ${firstPage}です`)
        if (this.vibration) {
          await this.vibration.vibratePattern(VIBRATION_PATTERNS.WARNING)
        }
        return
      }

      try {
        // 最初のページに切り替え
        await this.layout.switchPage(firstPage)

        // 振動フィードバック（SUCCESS）
        if (this.vibration) {
          await this.vibration.vibratePattern(VIBRATION_PATTERNS.SUCCESS)
        }

        logger.info(`✓ ページ${firstPage}に戻りました`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error(`ページ切り替えに失敗: ${message}`)
        if (this.vibration) {
          await this.vibration.vibratePattern(VIBRATION_PATTERNS.ERROR)
        }
      }
    }
  }
}
