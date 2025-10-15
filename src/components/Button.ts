import { autoSizeText } from '../utils/textUtils.ts'
import { logger } from '../utils/logger.ts'
import { loadImageFile, drawImage } from '../utils/imageLoader.ts'
import type { Image, CanvasRenderingContext2D } from 'canvas'
import type { VibrationUtil } from '../utils/vibration.ts'
import type { CellCoord } from './Screen.ts'

/**
 * ボタンコンポーネントのオプション
 */
export interface ButtonOptions {
  label?: string
  icon?: string | null
  iconImage?: string | null
  iconSize?: number
  bgColor?: string
  borderColor?: string
  textColor?: string
  hoverBgColor?: string
  onClick?: () => void | Promise<void>
  vibration?: VibrationUtil | null
  vibrationPattern?: string
}

/**
 * ボタンコンポーネント
 * クリック可能なボタンを表示
 */
export class Button {
  col: number
  row: number
  label: string
  private icon: string | null
  private iconImage: string | null
  private iconSize: number
  private bgColor: string
  private borderColor: string
  private textColor: string
  private hoverBgColor: string
  private onClick: () => void | Promise<void>
  private vibration: VibrationUtil | null
  private vibrationPattern: string
  private isHovered: boolean
  private loadedImage: Image | null
  private imageLoading: boolean

  /**
   * @param col - 列番号
   * @param row - 行番号
   * @param options - オプション設定
   */
  constructor(col: number, row: number, options: ButtonOptions = {}) {
    this.col = col
    this.row = row

    // ボタン設定
    this.label = options.label || 'Button'
    this.icon = options.icon || null // 絵文字アイコン（文字列）
    this.iconImage = options.iconImage || null // 画像アイコン（パス）
    this.iconSize = options.iconSize || 48 // 画像アイコンのサイズ
    this.bgColor = options.bgColor || '#2a4a6a'
    this.borderColor = options.borderColor || '#4a7a9a'
    this.textColor = options.textColor || '#FFFFFF'
    this.hoverBgColor = options.hoverBgColor || '#3a5a7a'
    this.onClick = options.onClick || (() => {})
    this.vibration = options.vibration || null // 振動ユーティリティ
    this.vibrationPattern = options.vibrationPattern || 'tap' // 振動パターン

    this.isHovered = false
    this.loadedImage = null // 読み込まれた画像オブジェクト
    this.imageLoading = false

    // 画像アイコンの読み込み
    if (this.iconImage) {
      this.loadIcon()
    }
  }

  /**
   * アイコン画像を非同期で読み込む
   */
  async loadIcon(): Promise<void> {
    if (this.imageLoading || this.loadedImage) {
      return
    }

    this.imageLoading = true

    try {
      this.loadedImage = await loadImageFile(this.iconImage!)
      logger.debug(`Button "${this.label}" のアイコンを読み込みました`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`Button "${this.label}" のアイコン読み込みに失敗: ${message}`)
    } finally {
      this.imageLoading = false
    }
  }

  /**
   * ボタンを描画
   * @param ctx - Canvas描画コンテキスト
   * @param cellCoord - セルの座標情報
   */
  draw(ctx: CanvasRenderingContext2D, cellCoord: CellCoord): void {
    const { x, y, width, height } = cellCoord

    // ボタンの背景
    ctx.fillStyle = this.isHovered ? this.hoverBgColor : this.bgColor
    ctx.fillRect(x, y, width, height)

    // ボタンの枠線
    ctx.strokeStyle = this.borderColor
    ctx.lineWidth = 2
    ctx.strokeRect(x + 1, y + 1, width - 2, height - 2)

    // テキストの最大幅
    const maxWidth = width - 10

    // 画像アイコン、絵文字アイコン、またはラベルのみを表示
    if (this.loadedImage) {
      // 画像アイコンがある場合
      ctx.fillStyle = this.textColor
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // 画像を上部に表示
      const iconY = y + height / 2 - this.iconSize / 2 - 8
      drawImage(
        ctx,
        this.loadedImage,
        x + width / 2 - this.iconSize / 2,
        iconY,
        this.iconSize,
        this.iconSize,
        true
      )

      // ラベルを下部に表示
      autoSizeText(ctx, this.label, maxWidth, 14, 10, '', 'sans-serif')
      ctx.fillText(this.label, x + width / 2, y + height / 2 + this.iconSize / 2 + 8)
    } else if (this.icon) {
      // 絵文字/NerdFontアイコンがある場合
      ctx.fillStyle = this.textColor
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // アイコンを上部に表示（大きめのフォント + NerdFont対応）
      ctx.font = '48px "JetBrainsMono Nerd Font Mono", sans-serif'
      ctx.fillText(this.icon, x + width / 2, y + height / 2 - 10)

      // ラベルを下部に表示
      autoSizeText(ctx, this.label, maxWidth, 14, 10, '', 'sans-serif')
      ctx.fillText(this.label, x + width / 2, y + height / 2 + 28)
    } else {
      // アイコンがない場合はラベルのみ中央に表示
      ctx.fillStyle = this.textColor
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      autoSizeText(ctx, this.label, maxWidth, 20, 12, 'bold', 'sans-serif')
      ctx.fillText(this.label, x + width / 2, y + height / 2)
    }
  }

  /**
   * ボタンがクリックされたかチェック
   * @param touchedCol - タッチされた列
   * @param touchedRow - タッチされた行
   * @returns このボタンがクリックされたか
   */
  async handleTouch(touchedCol: number, touchedRow: number): Promise<boolean> {
    logger.debug(
      `Button.handleTouch: ${this.label} - touched(${touchedCol},${touchedRow}) vs button(${this.col},${this.row})`
    )

    if (touchedCol === this.col && touchedRow === this.row) {
      logger.info(`Button clicked: ${this.label}`)

      // 振動フィードバック
      if (this.vibration) {
        logger.debug(`Vibrating with pattern: ${this.vibrationPattern}`)
        await this.vibration.vibratePattern(this.vibrationPattern)
      }

      logger.debug('Calling onClick handler')
      await this.onClick()
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
}
