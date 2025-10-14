import { autoSizeText } from '../utils/textUtils.js'
import { logger } from '../utils/logger.js'
import { VOLUME_DISPLAY_TIMEOUT_MS } from '../config/constants.js'

/**
 * メディア表示コンポーネント
 * 現在再生中のメディア情報を表示
 */
export class MediaDisplay {
  /**
   * @param {number} col - 表示する列番号
   * @param {number} row - 表示する行番号
   * @param {MediaControl} mediaControl - メディア制御インスタンス
   * @param {Object} options - オプション設定
   */
  constructor(col, row, mediaControl, options = {}) {
    this.col = col
    this.row = row
    this.mediaControl = mediaControl

    // スタイル設定
    this.options = {
      cellBgColor: options.cellBgColor || '#1a1a2e',
      cellBorderColor: options.cellBorderColor || '#8a4a6a',
      titleColor: options.titleColor || '#FFFFFF',
      artistColor: options.artistColor || '#FF88AA',
      statusColor: options.statusColor || '#AAAAAA',
      iconColor: options.iconColor || '#FF88AA',
      displayTimeout: options.displayTimeout || VOLUME_DISPLAY_TIMEOUT_MS,
    }

    // 振動フィードバック
    this.vibration = options.vibration || null

    // 表示状態管理
    this.visible = false
    this.hideTimer = null

    // メディア情報のキャッシュ
    this.cachedMetadata = {
      title: 'メディアなし',
      artist: '',
      album: '',
      status: 'Stopped',
    }
  }

  /**
   * コンポーネントを描画
   * @param {CanvasRenderingContext2D} ctx - Canvas描画コンテキスト
   * @param {Object} cellCoord - セルの座標情報
   */
  draw(ctx, cellCoord) {
    // 非表示の場合は何も描画しない
    if (!this.visible) {
      return
    }

    const { x, y, width, height } = cellCoord

    // キャッシュされたメディア情報を使用
    const metadata = this.cachedMetadata

    // セルの背景
    ctx.fillStyle = this.options.cellBgColor
    ctx.fillRect(x, y, width, height)

    // セルの枠線
    ctx.strokeStyle = this.options.cellBorderColor
    ctx.lineWidth = 2
    ctx.strokeRect(x + 1, y + 1, width - 2, height - 2)

    // レイアウト設定
    const padding = 8
    const iconSize = 20
    const topMargin = 6

    // アイコンの位置（一番上）
    const iconY = y + topMargin + iconSize / 2

    // タイトルの位置（アイコンの下、間隔を狭く）
    const titleY = iconY + iconSize / 2 + 8

    // アーティストの位置（タイトルの下、間隔を狭く）
    const artistY = titleY + 10

    // ステータスの位置（アーティストの下、間隔を狭く）
    const statusY = artistY + 10

    // アイコン（再生状態に応じて変更）
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `${iconSize}px sans-serif`

    let icon
    if (metadata.status === 'Playing') {
      icon = '▶️' // 再生中
    } else if (metadata.status === 'Paused') {
      icon = '⏸️' // 一時停止
    } else {
      icon = '⏹️' // 停止
    }

    ctx.fillText(icon, x + width / 2, iconY)

    // タイトル（アイコンの下）
    ctx.fillStyle = this.options.titleColor
    const title =
      metadata.title.length > 12 ? metadata.title.substring(0, 12) + '...' : metadata.title
    autoSizeText(ctx, title, width - padding * 2, 12, 9, 'bold', 'sans-serif')
    ctx.fillText(title, x + width / 2, titleY)

    // アーティスト（タイトルの下）
    if (metadata.artist) {
      ctx.fillStyle = this.options.artistColor
      const artist =
        metadata.artist.length > 15 ? metadata.artist.substring(0, 15) + '...' : metadata.artist
      ctx.font = '9px sans-serif'
      ctx.fillText(artist, x + width / 2, artistY)
    }

    // ステータステキスト（一番下）
    ctx.fillStyle = this.options.statusColor
    ctx.font = '8px sans-serif'
    const statusText =
      metadata.status === 'Playing'
        ? 'PLAYING'
        : metadata.status === 'Paused'
          ? 'PAUSED'
          : 'STOPPED'
    ctx.fillText(statusText, x + width / 2, statusY)
  }

  /**
   * 位置を取得
   * @returns {Object} { col, row }
   */
  getPosition() {
    return { col: this.col, row: this.row }
  }

  /**
   * メディア表示を一時的に表示
   * 指定時間後に自動的に非表示になる
   */
  async showTemporarily() {
    logger.debug('MediaDisplay: 一時表示開始')

    // メディア情報を取得してキャッシュ
    this.cachedMetadata = await this.mediaControl.getMetadata()

    // 既存のタイマーをクリア
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
    }

    // 表示
    this.visible = true

    // 指定時間後に非表示
    this.hideTimer = setTimeout(() => {
      this.visible = false
      logger.debug('MediaDisplay: 自動非表示')
    }, this.options.displayTimeout)
  }

  /**
   * 表示状態を取得
   * @returns {boolean} 表示中かどうか
   */
  isVisible() {
    return this.visible
  }

  /**
   * 手動で非表示にする
   */
  hide() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
    this.visible = false
    logger.debug('MediaDisplay: 手動非表示')
  }

  /**
   * クリーンアップ（タイマーをクリア）
   */
  cleanup() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
  }
}
