import { ellipsisText } from '../utils/textUtils.ts'
import { logger } from '../utils/logger.ts'
import {
  NOTIFICATION_DISPLAY_TIMEOUT_MS,
  NOTIFICATION_MAX_TITLE_LENGTH,
  NOTIFICATION_MAX_BODY_LENGTH,
} from '../config/constants.ts'
import type { NotificationData } from '../utils/notificationListener.ts'
import type { VibrationUtil } from '../utils/vibration.ts'
import type { CellCoord } from './Screen.ts'
import type { CanvasRenderingContext2D } from 'canvas'

interface NotificationDisplayOptions {
  cellBgColor?: string
  cellBorderColor?: string
  appNameColor?: string
  titleColor?: string
  bodyColor?: string
  displayTimeout?: number
  vibration?: VibrationUtil | null
}

export class NotificationDisplay {
  col: number
  row: number
  readonly fullScreen = true
  private options: Required<Omit<NotificationDisplayOptions, 'vibration'>> & {
    vibration: VibrationUtil | null
  }
  private visible: boolean
  private hideTimer: NodeJS.Timeout | null
  private currentNotification: NotificationData | null
  private notificationQueue: NotificationData[] = []

  constructor(col: number, row: number, options: NotificationDisplayOptions = {}) {
    this.col = col
    this.row = row

    this.options = {
      cellBgColor: options.cellBgColor || '#1a1a2e',
      cellBorderColor: options.cellBorderColor || '#6a4a8a',
      appNameColor: options.appNameColor || '#AA88FF',
      titleColor: options.titleColor || '#FFFFFF',
      bodyColor: options.bodyColor || '#CCCCCC',
      displayTimeout: options.displayTimeout || NOTIFICATION_DISPLAY_TIMEOUT_MS,
      vibration: options.vibration || null,
    }

    this.visible = false
    this.hideTimer = null
    this.currentNotification = null
  }

  draw(ctx: CanvasRenderingContext2D, cellCoord: CellCoord): void {
    if (!this.visible || !this.currentNotification) {
      return
    }

    const { x, y, width, height } = cellCoord
    const notification = this.currentNotification
    const padding = Math.max(12, Math.floor(height * 0.04))

    ctx.fillStyle = this.options.cellBgColor
    ctx.fillRect(x, y, width, height)

    ctx.strokeStyle = this.options.cellBorderColor
    ctx.lineWidth = 4
    ctx.strokeRect(x + 2, y + 2, width - 4, height - 4)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const rowHeight = height / 3
    const appNameSize = Math.max(18, Math.floor(rowHeight * 0.35))
    const titleSize = Math.max(22, Math.floor(rowHeight * 0.42))
    const bodySize = Math.max(18, Math.floor(rowHeight * 0.32))

    const appNameMax = Math.max(12, Math.floor((width - padding * 2) / (appNameSize * 0.6)))
    const titleMax = Math.max(12, Math.floor((width - padding * 2) / (titleSize * 0.6)))
    const bodyMax = Math.max(12, Math.floor((width - padding * 2) / (bodySize * 0.6)))

    const appNameText = `🔔 ${notification.appName || 'App'}`
    const appName = ellipsisText(appNameText, appNameMax)
    const title = ellipsisText(
      notification.summary,
      Math.max(NOTIFICATION_MAX_TITLE_LENGTH, titleMax)
    )
    const body = ellipsisText(
      notification.body ? notification.body.replace(/\n/g, ' ') : '',
      Math.max(NOTIFICATION_MAX_BODY_LENGTH, bodyMax)
    )

    ctx.fillStyle = this.options.appNameColor
    ctx.font = `bold ${appNameSize}px sans-serif`
    ctx.fillText(appName, x + width / 2, y + rowHeight * 0.5)

    ctx.fillStyle = this.options.titleColor
    ctx.font = `bold ${titleSize}px sans-serif`
    ctx.fillText(title, x + width / 2, y + rowHeight * 1.5)

    ctx.fillStyle = this.options.bodyColor
    ctx.font = `${bodySize}px sans-serif`
    ctx.fillText(body || ' ', x + width / 2, y + rowHeight * 2.5)
  }

  async handleTouch(): Promise<boolean> {
    if (!this.visible) {
      return false
    }

    logger.info('通知表示をタップ - 非表示')
    this.hide()
    return true
  }

  getPosition(): { col: number; row: number } {
    return { col: this.col, row: this.row }
  }

  async showNotification(notification: NotificationData): Promise<void> {
    logger.debug(`NotificationDisplay: 通知表示 - ${notification.appName}: ${notification.summary}`)

    if (this.visible) {
      this.notificationQueue.push(notification)
      return
    }

    this.currentNotification = notification
    this.visible = true

    if (this.options.vibration) {
      await this.options.vibration.vibratePattern('tap')
    }

    this.scheduleHide()
  }

  private scheduleHide(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
    }

    this.hideTimer = setTimeout(() => {
      this.visible = false
      this.currentNotification = null
      logger.debug('NotificationDisplay: 自動非表示')

      if (this.notificationQueue.length > 0) {
        const next = this.notificationQueue.shift()!
        this.showNotification(next)
      }
    }, this.options.displayTimeout)
  }

  isVisible(): boolean {
    return this.visible
  }

  hide(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
    this.visible = false
    this.currentNotification = null
    logger.debug('NotificationDisplay: 手動非表示')

    if (this.notificationQueue.length > 0) {
      const next = this.notificationQueue.shift()!
      setTimeout(() => this.showNotification(next), 300)
    }
  }

  cleanup(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
    this.notificationQueue = []
  }
}
