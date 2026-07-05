import { logger } from '../utils/logger.js'
import { KNOB_IDS, VIBRATION_PATTERNS } from '../config/constants.ts'
import type { HyprlandControl } from '../utils/hyprlandControl.ts'
import type { VibrationUtil } from '../utils/vibration.ts'

/**
 * ワークスペース制御イベントハンドラー
 * ノブの回転とクリックによるワークスペース切り替えを処理
 */
export class WorkspaceHandler {
  private hyprlandControl: HyprlandControl
  private vibration: VibrationUtil | null
  private currentWorkspace: number

  /**
   * @param hyprlandControl - Hyprland制御インスタンス
   * @param vibration - 振動ユーティリティ（オプショナル）
   */
  constructor(hyprlandControl: HyprlandControl, vibration: VibrationUtil | null = null) {
    this.hyprlandControl = hyprlandControl
    this.vibration = vibration
    this.currentWorkspace = 1
  }

  /**
   * 現在のワークスペースを初期化
   */
  async initialize(): Promise<void> {
    if (this.hyprlandControl.isAvailable()) {
      this.currentWorkspace = await this.hyprlandControl.getCurrentWorkspace()
      logger.info(`🖥️  現在のワークスペース: ${this.currentWorkspace}`)
    }
  }

  /**
   * ノブ回転イベントを処理（ワークスペース移動）
   * @param id - ノブID
   * @param delta - 回転量（-1 または +1）
   */
  async handleRotate(id: string, delta: number): Promise<void> {
    logger.info(`🔄 ノブ ${id} 回転: ${delta > 0 ? '+' : ''}${delta}`)

    // knobCL（中央左のノブ）をワークスペース操作に使用
    if (id === KNOB_IDS.CENTER_LEFT) {
      if (!this.hyprlandControl.isAvailable()) {
        logger.warn('Hyprlandが利用できません')
        if (this.vibration) {
          await this.vibration.vibratePattern(VIBRATION_PATTERNS.ERROR)
        }
        return
      }

      // 現在のワークスペースを取得
      const currentWs = await this.hyprlandControl.getCurrentWorkspace()
      if (currentWs > 0) {
        this.currentWorkspace = currentWs
      }

      // 次または前のワークスペースに移動
      let targetWorkspace: number
      if (delta > 0) {
        // 時計回り：次のワークスペース
        targetWorkspace = this.currentWorkspace + 1
        if (targetWorkspace > 10) {
          targetWorkspace = 1 // 10を超えたら1に戻る
        }
        logger.info(`🖥️  次のワークスペース: ${targetWorkspace}`)
      } else {
        // 反時計回り：前のワークスペース
        targetWorkspace = this.currentWorkspace - 1
        if (targetWorkspace < 1) {
          targetWorkspace = 10 // 1未満なら10に戻る
        }
        logger.info(`🖥️  前のワークスペース: ${targetWorkspace}`)
      }

      try {
        // ワークスペースを切り替え
        await this.hyprlandControl.switchWorkspace(targetWorkspace)
        this.currentWorkspace = targetWorkspace

        // 振動フィードバック
        if (this.vibration) {
          await this.vibration.vibratePattern(VIBRATION_PATTERNS.TAP)
        }

        logger.info(`✓ ワークスペース ${targetWorkspace} に切り替えました`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error(`ワークスペース切り替えに失敗: ${message}`)
        if (this.vibration) {
          await this.vibration.vibratePattern(VIBRATION_PATTERNS.ERROR)
        }
      }
    }
  }

  /**
   * ノブクリックイベントを処理（ワークスペース1に戻る）
   * @param id - ノブID
   */
  async handleDown(id: string): Promise<void> {
    // knobCL（中央左のノブ）クリックでワークスペース1に戻る
    if (id === KNOB_IDS.CENTER_LEFT) {
      logger.info('🔘 ノブ knobCL クリック - ワークスペース1に戻る')

      if (!this.hyprlandControl.isAvailable()) {
        logger.warn('Hyprlandが利用できません')
        if (this.vibration) {
          await this.vibration.vibratePattern(VIBRATION_PATTERNS.ERROR)
        }
        return
      }

      try {
        // ワークスペース1に切り替え
        await this.hyprlandControl.switchWorkspace(1)
        this.currentWorkspace = 1

        // 振動フィードバック（SUCCESS）
        if (this.vibration) {
          await this.vibration.vibratePattern(VIBRATION_PATTERNS.SUCCESS)
        }

        logger.info('✓ ワークスペース1に戻りました')
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error(`ワークスペース切り替えに失敗: ${message}`)
        if (this.vibration) {
          await this.vibration.vibratePattern(VIBRATION_PATTERNS.ERROR)
        }
      }
    }
  }
}
