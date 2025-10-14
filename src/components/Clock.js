import { autoSizeText, formatDate, formatTime } from '../utils/textUtils.js'

/**
 * 時計コンポーネント
 * 指定されたセルに現在時刻と日付を表示
 */
export class Clock {
  /**
   * @param {number} col - 表示する列番号
   * @param {number} row - 表示する行番号
   * @param {Object} options - オプション設定
   */
  constructor(col = 0, row = 0, options = {}) {
    this.col = col
    this.row = row

    // スタイル設定
    this.options = {
      cellBgColor: options.cellBgColor || '#1a1a3e',
      cellBorderColor: options.cellBorderColor || '#4466AA',
      timeColor: options.timeColor || '#FFFFFF',
      dateColor: options.dateColor || '#88AAFF',
      showSeconds: options.showSeconds !== undefined ? options.showSeconds : true,
      gridColor: options.gridColor || '#222222',
    }
  }

  /**
   * セルに時計を描画
   * @param {CanvasRenderingContext2D} ctx - Canvas描画コンテキスト
   * @param {Object} cellCoord - セルの座標情報
   */
  draw(ctx, cellCoord) {
    const now = new Date()
    const timeStr = formatTime(now, this.options.showSeconds)
    const dateStr = formatDate(now)

    const { x, y, width, height } = cellCoord

    // セルの背景
    ctx.fillStyle = this.options.cellBgColor
    ctx.fillRect(x, y, width, height)

    // セルの枠線
    ctx.strokeStyle = this.options.cellBorderColor
    ctx.lineWidth = 2
    ctx.strokeRect(x + 1, y + 1, width - 2, height - 2)

    // テキストの最大幅（左右にマージン）
    const maxWidth = width - 10

    // 時刻を表示（自動サイズ調整）
    ctx.fillStyle = this.options.timeColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    autoSizeText(ctx, timeStr, maxWidth, 24, 12, 'bold', 'sans-serif')
    ctx.fillText(timeStr, x + width / 2, y + height / 2 - 8)

    // 日付を表示（自動サイズ調整）
    ctx.fillStyle = this.options.dateColor
    autoSizeText(ctx, dateStr, maxWidth, 16, 10, '', 'sans-serif')
    ctx.fillText(dateStr, x + width / 2, y + height / 2 + 16)
  }

  /**
   * 位置を取得
   * @returns {Object} { col, row }
   */
  getPosition() {
    return { col: this.col, row: this.row }
  }
}
