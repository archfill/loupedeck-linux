import { logger } from '../utils/logger.js'
import { KNOB_IDS, VIBRATION_PATTERNS } from '../config/constants.ts'
import type { GridLayout } from '../components/GridLayout.ts'
import type { VibrationUtil } from '../utils/vibration.ts'
import type { WorkspaceButton } from '../components/WorkspaceButton.ts'

/**
 * ページ切替イベントハンドラー
 * ノブの回転とクリックによるページ切り替えを処理
 */
export class PageHandler {
  private layout: GridLayout
  private vibration: VibrationUtil | null
  private workspaceButtons: WorkspaceButton[]

  /**
   * @param layout - グリッドレイアウト
   * @param workspaceButtons - ワークスペースボタンの配列
   * @param vibration - 振動ユーティリティ（オプショナル）
   */
  constructor(
    layout: GridLayout,
    workspaceButtons: WorkspaceButton[],
    vibration: VibrationUtil | null = null
  ) {
    this.layout = layout
    this.workspaceButtons = workspaceButtons
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
      const currentPage = this.layout.getCurrentPage()
      let targetPage: number

      if (delta > 0) {
        // 時計回り：次のページ
        targetPage = currentPage === 1 ? 2 : 1
        logger.info(`📄 次のページ: ${targetPage}`)
      } else {
        // 反時計回り：前のページ
        targetPage = currentPage === 1 ? 2 : 1
        logger.info(`📄 前のページ: ${targetPage}`)
      }

      try {
        // ページを切り替え
        await this.layout.switchPage(targetPage)

        // ページ2に切り替えた時は、ワークスペースボタンのアクティブ状態を更新
        if (targetPage === 2) {
          for (const wsButton of this.workspaceButtons) {
            await wsButton.updateActiveState()
          }
          await this.layout.update()
        }

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

      const currentPage = this.layout.getCurrentPage()
      if (currentPage === 1) {
        logger.info('既にページ1です')
        if (this.vibration) {
          await this.vibration.vibratePattern(VIBRATION_PATTERNS.WARNING)
        }
        return
      }

      try {
        // ページ1に切り替え
        await this.layout.switchPage(1)

        // 振動フィードバック（SUCCESS）
        if (this.vibration) {
          await this.vibration.vibratePattern(VIBRATION_PATTERNS.SUCCESS)
        }

        logger.info('✓ ページ1に戻りました')
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
