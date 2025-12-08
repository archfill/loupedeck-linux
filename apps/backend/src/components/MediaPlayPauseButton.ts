import { Button, type ButtonOptions } from './Button.ts'
import type { MediaControl } from '../utils/mediaControl.ts'
import type { CanvasRenderingContext2D } from 'canvas'
import type { CellCoord } from './Screen.ts'
import { autoSizeText } from '../utils/textUtils.ts'

/**
 * メディア再生/一時停止ボタン
 * 再生状態に応じてアイコンを動的に切り替える
 */
export class MediaPlayPauseButton extends Button {
  private mediaControl: MediaControl
  private playIcon = '󰐊' // NerdFont: mdi-play (U+F040A)
  private pauseIcon = '󰏤' // NerdFont: mdi-pause (U+F03E4)
  private currentIcon: string

  /**
   * @param col - 列番号
   * @param row - 行番号
   * @param mediaControl - メディア制御インスタンス
   * @param options - ボタンオプション
   */
  constructor(
    col: number,
    row: number,
    mediaControl: MediaControl,
    options: ButtonOptions = {}
  ) {
    // 初期アイコンとして再生アイコンを設定
    super(col, row, { ...options, icon: '󰐊' })
    this.mediaControl = mediaControl
    this.currentIcon = this.playIcon
  }

  /**
   * メディアの再生状態を取得してアイコンを更新
   */
  async updateIcon(): Promise<void> {
    const status = await this.mediaControl.getStatus()
    this.currentIcon = status === 'Playing' ? this.pauseIcon : this.playIcon
  }

  /**
   * ボタンを描画（動的にアイコンを選択）
   * @param ctx - Canvas描画コンテキスト
   * @param cellCoord - セルの座標情報
   */
  draw(ctx: CanvasRenderingContext2D, cellCoord: CellCoord): void {
    const { x, y, width, height } = cellCoord

    // ボタンの背景
    const bgColor = '#C62828'
    ctx.fillStyle = bgColor
    ctx.fillRect(x, y, width, height)

    // ボタンの枠線
    const borderColor = '#E53935'
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 2
    ctx.strokeRect(x + 1, y + 1, width - 2, height - 2)

    // アイコンとラベルを表示
    const textColor = '#FFFFFF'
    ctx.fillStyle = textColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // アイコンを上部に表示
    ctx.font = '48px "JetBrainsMono Nerd Font Mono", sans-serif'
    ctx.fillText(this.currentIcon, x + width / 2, y + height / 2 - 10)

    // ラベルを下部に表示
    const label = 'Play/Pause'
    const maxWidth = width - 10
    autoSizeText(ctx, label, maxWidth, 14, 10, '', 'sans-serif')
    ctx.fillText(label, x + width / 2, y + height / 2 + 28)
  }

  /**
   * ボタンがクリックされた時の処理
   * クリック後にアイコンを更新
   */
  async handleTouch(touchedCol: number, touchedRow: number): Promise<boolean> {
    const wasHandled = await super.handleTouch(touchedCol, touchedRow)
    if (wasHandled) {
      // クリック後、少し待ってからアイコンを更新
      setTimeout(async () => {
        await this.updateIcon()
      }, 200)
    }
    return wasHandled
  }
}
