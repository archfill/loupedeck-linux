import { autoSizeText, formatDate, formatTime } from '../utils/textUtils.ts'

/**
 * Canvas描画コンテキストの型
 */
type CanvasRenderingContext2D = any

/**
 * セル座標
 */
interface CellCoord {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 時計コンポーネントのオプション
 */
interface ClockOptions {
  cellBgColor?: string
  cellBorderColor?: string
  timeColor?: string
  dateColor?: string
  showSeconds?: boolean
  gridColor?: string
}

/**
 * 時計コンポーネント
 * 指定されたセルに現在時刻と日付を表示
 */
export class Clock {
  col: number
  row: number
  private options: Required<ClockOptions>

  /**
   * @param col - 表示する列番号
   * @param row - 表示する行番号
   * @param options - オプション設定
   */
  constructor(col: number = 0, row: number = 0, options: ClockOptions = {}) {
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
   * @param ctx - Canvas描画コンテキスト
   * @param cellCoord - セルの座標情報
   */
  draw(ctx: CanvasRenderingContext2D, cellCoord: CellCoord): void {
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
   * @returns { col, row }
   */
  getPosition(): { col: number; row: number } {
    return { col: this.col, row: this.row }
  }
}
