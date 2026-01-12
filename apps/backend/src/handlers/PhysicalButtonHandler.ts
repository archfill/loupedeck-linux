/**
 * PhysicalButtonHandler
 *
 * 物理ボタン（BTN 0-3）の動作を設定ファイルから制御するハンドラー
 */

import { AppLauncher } from '../utils/appLauncher.js'
import { GridLayout } from '../components/GridLayout.js'
import { WorkspaceButton } from '../components/WorkspaceButton.js'
import { VibrationUtil } from '../utils/vibration.js'
import type { Button } from '../components/Button.js'
import { logger } from '../utils/logger.js'

const VIBRATION_PATTERNS = {
  TAP: 'tap',
  ERROR: 'error',
} as const

export class PhysicalButtonHandler {
  constructor(
    private appLauncher: AppLauncher,
    private layout: GridLayout,
    private workspaceButtons: WorkspaceButton[],
    private vibration: VibrationUtil | null,
    private buttonConfigs: Map<number, Button>
  ) {}

  /**
   * 物理ボタンが押された時のハンドラー
   *
   * @param buttonId - ボタンID (0-3)
   */
  async handleDown(buttonId: number): Promise<void> {
    const config = this.buttonConfigs.get(buttonId)

    if (!config) {
      logger.debug(`物理ボタン ID=${buttonId} の設定が見つかりません`)
      return
    }

    const { command, options } = config

    // コマンドが空の場合は何もしない
    if (!command || command.trim() === '') {
      logger.debug(`物理ボタン ${options.label} (ID=${buttonId}) は未割り当てです`)
      return
    }

    // 特殊構文: page:N
    if (command.startsWith('page:')) {
      const pageNum = Number.parseInt(command.slice(5), 10)
      if (Number.isNaN(pageNum) || pageNum < 1 || pageNum > 2) {
        logger.warn(`無効なページ番号: ${command}`)
        if (this.vibration) {
          await this.vibration.vibratePattern(VIBRATION_PATTERNS.ERROR)
        }
        return
      }
      await this.switchPage(pageNum)
      return
    }

    // 通常のシェルコマンドを実行
    await this.executeCommand(command, options.label || `Button ${buttonId}`)
  }

  /**
   * ページを切り替える
   *
   * @param pageNum - ページ番号 (1 または 2)
   */
  private async switchPage(pageNum: number): Promise<void> {
    await this.layout.switchPage(pageNum)

    if (this.vibration) {
      await this.vibration.vibratePattern(VIBRATION_PATTERNS.TAP)
    }

    logger.info(`ページ${pageNum}に切り替えました`)

    // ページ2の場合はワークスペースボタンの状態を更新
    if (pageNum === 2) {
      for (const wsButton of this.workspaceButtons) {
        await wsButton.updateActiveState()
      }
      await this.layout.update()
    }
  }

  /**
   * シェルコマンドを実行する
   *
   * @param command - 実行するコマンド
   * @param label - ボタンのラベル（ログ用）
   */
  private async executeCommand(command: string, label: string): Promise<void> {
    try {
      await this.appLauncher.launch(command)
      logger.info(`物理ボタン ${label} でコマンドを実行: ${command}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`物理ボタン ${label} のコマンド実行に失敗: ${message}`)
    }
  }

  /**
   * ボタン設定を更新する（ホットリロード用）
   *
   * @param configs - 新しいボタン設定のマップ
   */
  updateButtonConfigs(configs: Map<number, Button>): void {
    this.buttonConfigs = configs
  }
}
