import dbus from 'dbus-next'
import { logger } from './logger.ts'

export interface NotificationData {
  appName: string
  summary: string
  body: string
  icon: string
  id: number
}

type NotificationCallback = (notification: NotificationData) => void

export class NotificationListener {
  private bus: dbus.MessageBus | null = null
  private callbacks: NotificationCallback[] = []
  private isConnected = false

  async start(): Promise<void> {
    if (this.isConnected) {
      logger.warn('NotificationListener: 既に接続中')
      return
    }

    try {
      this.bus = dbus.sessionBus()

      const obj = await this.bus.getProxyObject('org.freedesktop.DBus', '/org/freedesktop/DBus')

      const monitor = obj.getInterface('org.freedesktop.DBus.Monitoring') as unknown as {
        BecomeMonitor: (rules: string[], flags: number) => Promise<void>
      }
      await monitor.BecomeMonitor(
        [
          "type='method_call',member='Notify',path='/org/freedesktop/Notifications',interface='org.freedesktop.Notifications'",
        ],
        0
      )

      this.bus.on('message', (msg: dbus.Message) => {
        if (
          msg.type === dbus.MessageType.METHOD_CALL &&
          msg.member === 'Notify' &&
          msg.interface === 'org.freedesktop.Notifications'
        ) {
          this.handleNotifyMessage(msg)
        }
      })

      this.isConnected = true
      logger.info('NotificationListener: D-Bus通知監視を開始')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`NotificationListener: 開始失敗 - ${message}`)
      throw error
    }
  }

  private handleNotifyMessage(msg: dbus.Message): void {
    try {
      const args = msg.body as unknown[]
      if (!args || args.length < 5) {
        return
      }

      const notification: NotificationData = {
        appName: String(args[0] || ''),
        id: Number(args[1] || 0),
        icon: String(args[2] || ''),
        summary: String(args[3] || ''),
        body: String(args[4] || ''),
      }

      logger.debug(
        `NotificationListener: 通知受信 - ${notification.appName}: ${notification.summary}`
      )

      for (const callback of this.callbacks) {
        try {
          callback(notification)
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err)
          logger.error(`NotificationListener: コールバックエラー - ${errMsg}`)
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`NotificationListener: メッセージ解析エラー - ${message}`)
    }
  }

  onNotification(callback: NotificationCallback): void {
    this.callbacks.push(callback)
  }

  removeCallback(callback: NotificationCallback): void {
    const index = this.callbacks.indexOf(callback)
    if (index !== -1) {
      this.callbacks.splice(index, 1)
    }
  }

  async stop(): Promise<void> {
    if (this.bus) {
      this.bus.disconnect()
      this.bus = null
    }
    this.callbacks = []
    this.isConnected = false
    logger.info('NotificationListener: 停止')
  }
}
