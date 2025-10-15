import { logger } from '../utils/logger.ts'
import type { HyprlandControl } from '../utils/hyprlandControl.ts'
import type { VibrationUtil } from '../utils/vibration.ts'
import type { CellCoord } from './Screen.ts'
import type { CanvasRenderingContext2D } from 'canvas'

/**
 * ワークスペースボタンのオプション
 */
export interface WorkspaceButtonOptions {
  bgColor?: string
  activeBgColor?: string
  borderColor?: string
  activeBorderColor?: string
  textColor?: string
  activeTextColor?: string
  vibration?: VibrationUtil | null
  vibrationPattern?: string
}

/**
 * ワークスペースボタンコンポーネント
 * Hyprlandのワークスペースを切り替えるボタン
 */
export class WorkspaceButton {
  col: number
  row: number
  label: string
  private workspaceId: number
  private hyprlandControl: HyprlandControl
  private bgColor: string
  private activeBgColor: string
  private borderColor: string
  private activeBorderColor: string
  private textColor: string
  private activeTextColor: string
  private vibration: VibrationUtil | null
  private vibrationPattern: string
  private isActive: boolean
  private checkActiveWorkspace: boolean

  /**
   * @param col - 列番号
   * @param row - 行番号
   * @param workspaceId - ワークスペース番号
   * @param hyprlandControl - HyprlandControlインスタンス
   * @param options - オプション設定
   */
  constructor(
    col: number,
    row: number,
    workspaceId: number,
    hyprlandControl: HyprlandControl,
    options: WorkspaceButtonOptions = {}
  ) {
    this.col = col
    this.row = row
    this.workspaceId = workspaceId
    this.hyprlandControl = hyprlandControl
    this.label = `WS ${workspaceId}`

    // ボタン設定
    this.bgColor = options.bgColor || '#1e3a5f'
    this.activeBgColor = options.activeBgColor || '#4a9eff'
    this.borderColor = options.borderColor || '#3a5a7f'
    this.activeBorderColor = options.activeBorderColor || '#6abfff'
    this.textColor = options.textColor || '#FFFFFF'
    this.activeTextColor = options.activeTextColor || '#FFFFFF'
    this.vibration = options.vibration || null
    this.vibrationPattern = options.vibrationPattern || 'tap'

    this.isActive = false
    this.checkActiveWorkspace = true
  }

  /**
   * 現在のワークスペースがこのボタンのワークスペースかチェック
   */
  async updateActiveState(): Promise<void> {
    if (!this.checkActiveWorkspace || !this.hyprlandControl.isAvailable()) {
      return
    }

    try {
      const currentWorkspace = await this.hyprlandControl.getCurrentWorkspace()
      this.isActive = currentWorkspace === this.workspaceId
    } catch (error) {
      // エラーが発生した場合はチェックを無効化
      logger.debug(`Failed to check active workspace: ${error}`)
      this.checkActiveWorkspace = false
    }
  }

  /**
   * ワークスペースボタンを描画
   * @param ctx - Canvas描画コンテキスト
   * @param cellCoord - セルの座標情報
   */
  draw(ctx: CanvasRenderingContext2D, cellCoord: CellCoord): void {
    const { x, y, width, height } = cellCoord

    // 背景色を選択（アクティブかどうか）
    const bgColor = this.isActive ? this.activeBgColor : this.bgColor
    const borderColor = this.isActive ? this.activeBorderColor : this.borderColor
    const textColor = this.isActive ? this.activeTextColor : this.textColor

    // ボタンの背景
    ctx.fillStyle = bgColor
    ctx.fillRect(x, y, width, height)

    // ボタンの枠線
    ctx.strokeStyle = borderColor
    ctx.lineWidth = this.isActive ? 3 : 2
    ctx.strokeRect(x + 1, y + 1, width - 2, height - 2)

    // ワークスペース番号を大きく表示
    ctx.fillStyle = textColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold 36px sans-serif'
    ctx.fillText(String(this.workspaceId), x + width / 2, y + height / 2 - 8)

    // ラベルを下部に小さく表示
    ctx.font = '12px sans-serif'
    ctx.fillText('Workspace', x + width / 2, y + height / 2 + 24)
  }

  /**
   * ボタンがクリックされたかチェック
   * @param touchedCol - タッチされた列
   * @param touchedRow - タッチされた行
   * @returns このボタンがクリックされたか
   */
  async handleTouch(touchedCol: number, touchedRow: number): Promise<boolean> {
    logger.debug(
      `WorkspaceButton.handleTouch: ${this.label} - touched(${touchedCol},${touchedRow}) vs button(${this.col},${this.row})`
    )

    if (touchedCol === this.col && touchedRow === this.row) {
      logger.info(`Workspace button clicked: ${this.label}`)

      // 振動フィードバック
      if (this.vibration) {
        logger.debug(`Vibrating with pattern: ${this.vibrationPattern}`)
        await this.vibration.vibratePattern(this.vibrationPattern)
      }

      // ワークスペースを切り替え
      try {
        await this.hyprlandControl.switchWorkspace(this.workspaceId)
        // 切り替え後、アクティブ状態を更新
        await this.updateActiveState()
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error(`Failed to switch workspace: ${message}`)
        // エラーの場合は error パターンで振動
        if (this.vibration) {
          await this.vibration.vibratePattern('error')
        }
      }

      return true
    }
    return false
  }

  /**
   * 位置を取得
   * @returns { col, row }
   */
  getPosition(): { col: number; row: number } {
    return { col: this.col, row: this.row }
  }

  /**
   * ワークスペースIDを取得
   * @returns ワークスペースID
   */
  getWorkspaceId(): number {
    return this.workspaceId
  }
}
