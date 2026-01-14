import { logger } from '../utils/logger.ts'
import type { NotificationListener, NotificationData } from '../utils/notificationListener.ts'
import type { NotificationDisplay } from '../components/NotificationDisplay.ts'
import type { GridLayout } from '../components/GridLayout.ts'

export class NotificationHandler {
  private listener: NotificationListener
  private notificationDisplay: NotificationDisplay
  private layout: GridLayout
  private onNotifyBound: (notification: NotificationData) => Promise<void>

  constructor(
    listener: NotificationListener,
    notificationDisplay: NotificationDisplay,
    layout: GridLayout
  ) {
    this.listener = listener
    this.notificationDisplay = notificationDisplay
    this.layout = layout

    this.onNotifyBound = async (notification: NotificationData) => {
      await this.notificationDisplay.showNotification(notification)
      await this.layout.update()
    }
  }

  async start(): Promise<void> {
    this.listener.onNotification(this.onNotifyBound)
    await this.listener.start()
    logger.info('NotificationHandler: 監視開始')
  }

  async stop(): Promise<void> {
    this.listener.removeCallback(this.onNotifyBound)
    await this.listener.stop()
    logger.info('NotificationHandler: 停止')
  }
}
