import { autoSizeText } from '../utils/textUtils.js'
import { logger } from '../utils/logger.js'

/**
 * 音量表示コンポーネント
 * 現在の音量をビジュアルバーとパーセンテージで表示
 */
export class VolumeDisplay {
  /**
   * @param {number} col - 表示する列番号
   * @param {number} row - 表示する行番号
   * @param {VolumeControl} volumeControl - 音量制御インスタンス
   * @param {Object} options - オプション設定
   */
  constructor(col, row, volumeControl, options = {}) {
    this.col = col
    this.row = row
    this.volumeControl = volumeControl

    // スタイル設定
    this.options = {
      cellBgColor: options.cellBgColor || '#1a1a2e',
      cellBorderColor: options.cellBorderColor || '#4a6a8a',
      barBgColor: options.barBgColor || '#2a2a3e',
      barFillColor: options.barFillColor || '#4a9eff',
      barFillColorMuted: options.barFillColorMuted || '#666666',
      textColor: options.textColor || '#FFFFFF',
      mutedTextColor: options.mutedTextColor || '#888888',
      labelColor: options.labelColor || '#88AAFF',
      displayTimeout: options.displayTimeout || 2000, // 表示時間（ミリ秒）
    }

    // 振動フィードバック
    this.vibration = options.vibration || null

    // 表示状態管理
    this.visible = false
    this.hideTimer = null
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

    // 現在の音量とミュート状態を取得
    const volume = this.volumeControl.getCurrentVolume()
    const isMuted = this.volumeControl.getIsMuted()

    // セルの背景
    ctx.fillStyle = this.options.cellBgColor
    ctx.fillRect(x, y, width, height)

    // セルの枠線
    ctx.strokeStyle = this.options.cellBorderColor
    ctx.lineWidth = 2
    ctx.strokeRect(x + 1, y + 1, width - 2, height - 2)

    // レイアウト設定
    const padding = 8
    const iconSize = 22
    const barHeight = 8
    const topMargin = 8 // 上部マージン

    // 上から配置を計算
    // アイコンの位置（一番上）
    const iconY = y + topMargin + iconSize / 2

    // バーの位置（アイコンの下、間隔を狭く）
    const barY = iconY + iconSize / 2 + 4
    const barWidth = width - padding * 2
    const barX = x + padding

    // パーセンテージの位置（バーの下、間隔を狭く）
    const percentY = barY + barHeight + 10

    // ミュートテキストの位置（パーセンテージの下、間隔を狭く）
    const muteY = percentY + 12

    // 音量アイコン（スピーカー絵文字）
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `${iconSize}px sans-serif`

    // ミュート状態に応じてアイコンを変更
    let icon
    if (isMuted) {
      icon = '🔇' // ミュート
    } else if (volume >= 70) {
      icon = '🔊' // 音量大
    } else if (volume >= 30) {
      icon = '🔉' // 音量中
    } else if (volume > 0) {
      icon = '🔈' // 音量小
    } else {
      icon = '🔇' // 無音
    }

    ctx.fillText(icon, x + width / 2, iconY)

    // 音量バーの描画（アイコンの下）
    // バー背景
    ctx.fillStyle = this.options.barBgColor
    ctx.fillRect(barX, barY, barWidth, barHeight)

    // バー（音量レベル）
    if (!isMuted && volume > 0) {
      const fillWidth = (barWidth * volume) / 100
      ctx.fillStyle = this.options.barFillColor
      ctx.fillRect(barX, barY, fillWidth, barHeight)
    } else if (isMuted) {
      // ミュート時は灰色のバー
      const fillWidth = (barWidth * volume) / 100
      ctx.fillStyle = this.options.barFillColorMuted
      ctx.fillRect(barX, barY, fillWidth, barHeight)
    }

    // バーの枠線
    ctx.strokeStyle = this.options.cellBorderColor
    ctx.lineWidth = 1
    ctx.strokeRect(barX, barY, barWidth, barHeight)

    // 音量パーセンテージ（バーの下）
    const volumeText = `${volume}%`
    ctx.fillStyle = isMuted ? this.options.mutedTextColor : this.options.textColor
    autoSizeText(ctx, volumeText, width - padding * 2, 18, 12, 'bold', 'sans-serif')
    ctx.fillText(volumeText, x + width / 2, percentY)

    // ミュートテキスト（一番下）
    if (isMuted) {
      ctx.fillStyle = this.options.mutedTextColor
      ctx.font = '10px sans-serif'
      ctx.fillText('MUTE', x + width / 2, muteY)
    }
  }

  /**
   * タッチイベントを処理（タップでミュート切り替え）
   * @param {number} touchedCol - タッチされた列
   * @param {number} touchedRow - タッチされた行
   * @returns {Promise<boolean>} 処理されたか
   */
  async handleTouch(touchedCol, touchedRow) {
    if (touchedCol === this.col && touchedRow === this.row) {
      logger.info('音量表示をタップ - ミュート切り替え')

      // 表示を延長
      this.showTemporarily()

      // ミュート切り替え
      const isMuted = await this.volumeControl.toggleMute()

      // 振動フィードバック
      if (this.vibration) {
        if (isMuted) {
          await this.vibration.vibratePattern('warning')
        } else {
          await this.vibration.vibratePattern('success')
        }
      }

      logger.info(`ミュート状態: ${isMuted ? 'ON' : 'OFF'}`)
      return true
    }
    return false
  }

  /**
   * 位置を取得
   * @returns {Object} { col, row }
   */
  getPosition() {
    return { col: this.col, row: this.row }
  }

  /**
   * 音量を更新（外部から呼び出す）
   * @param {number} volume - 新しい音量
   */
  updateVolume(volume) {
    logger.debug(`VolumeDisplay: 音量更新 ${volume}%`)
    // draw()で最新の音量を取得するため、ここでは何もしない
  }

  /**
   * 音量表示を一時的に表示
   * 指定時間後に自動的に非表示になる
   */
  showTemporarily() {
    logger.debug('VolumeDisplay: 一時表示開始')

    // 既存のタイマーをクリア
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
    }

    // 表示
    this.visible = true

    // 指定時間後に非表示
    this.hideTimer = setTimeout(() => {
      this.visible = false
      logger.debug('VolumeDisplay: 自動非表示')
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
    logger.debug('VolumeDisplay: 手動非表示')
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
