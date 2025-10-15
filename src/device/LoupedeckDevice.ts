import { discover, type LoupedeckDevice as LoupedeckDeviceType } from 'loupedeck'
import { logger } from '../utils/logger.ts'
import { VibrationUtil } from '../utils/vibration.ts'

interface TouchEvent {
  x: number
  y: number
  target?: { key?: string }
}

interface TouchData {
  changedTouches: TouchEvent[]
}

interface TouchCallback {
  (data: { id: number; col: number; row: number; x: number; y: number }): void | Promise<void>
}

/**
 * Loupedeckデバイス管理クラス
 * デバイスの接続、イベント処理、終了処理を管理
 */
export class LoupedeckDevice {
  private device: LoupedeckDeviceType | null
  private vibration: VibrationUtil | null

  constructor() {
    this.device = null
    this.vibration = null
  }

  /**
   * デバイスに接続
   * @returns デバイスオブジェクト
   */
  async connect(): Promise<LoupedeckDeviceType> {
    logger.info('Loupedeck デバイスを検索中...')

    try {
      // 既存の接続があれば先に切断
      if (this.device) {
        logger.debug('既存のデバイス接続を切断中...')
        await this.disconnect()
      }

      this.device = await discover()
      logger.info('✓ デバイスが見つかりました!')
      logger.info(`  タイプ: ${this.device.type}`)
      logger.info(
        `  画面サイズ: ${this.device.displays.center.width}x${this.device.displays.center.height}`
      )
      logger.info(`  グリッド: ${this.device.columns}列 x ${this.device.rows}行\n`)

      // 振動ユーティリティを初期化
      this.vibration = new VibrationUtil(this.device)

      // 基本的なイベントリスナーを設定
      this.setupDefaultEventHandlers()

      // 接続完了の振動フィードバック
      await this.vibration.vibratePattern('connect')

      return this.device
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`✗ デバイスの接続に失敗しました: ${message}`)
      throw error
    }
  }

  /**
   * デフォルトのイベントハンドラーを設定
   */
  private setupDefaultEventHandlers(): void {
    if (!this.device) {
      return
    }

    this.device.on('connect', () => {
      logger.info('✓ デバイスが接続されました')
    })

    this.device.on('disconnect', () => {
      logger.warn('✗ デバイスが切断されました')
      process.exit(0)
    })

    // すべてのイベントをデバッグログに出力
    const events = ['down', 'up', 'touchstart', 'touchmove', 'touchend', 'rotate'] as const
    events.forEach((eventName) => {
      if (this.device) {
        this.device.on(eventName, (data: unknown) => {
          logger.debug(`Device event: ${eventName}`)
          logger.debug(data)
        })
      }
    })
  }

  /**
   * タッチイベントハンドラーを追加
   * @param callback - タッチイベントのコールバック関数
   */
  onTouch(callback: TouchCallback): void {
    if (!this.device) {
      logger.warn('onTouch: device is null')
      return
    }

    logger.debug('onTouch handler registered for touchstart events')

    // 画面タッチイベント用（Loupedeck Live Sの画面）
    this.device.on('touchstart', (data: unknown) => {
      const touchData = data as TouchData
      const { changedTouches } = touchData
      logger.debug(`onTouch: 'touchstart' event fired with ${changedTouches?.length || 0} touches`)

      if (!changedTouches || changedTouches.length === 0) {
        logger.warn('touchstart event has no changedTouches')
        return
      }

      if (!this.device) {
        return
      }

      changedTouches.forEach((touch) => {
        const { x, y, target } = touch
        logger.debug(`Touch at x=${x}, y=${y}, target=${target?.key}`)

        if (!this.device) {
          return
        }

        // 画面レイアウトの計算
        const keySize = this.device.keySize || 90
        const screenWidth = this.device.displays.center.width
        const totalWidth = keySize * this.device.columns
        const marginX = (screenWidth - totalWidth) / 2

        // タッチ座標からグリッドの列・行を計算（marginXを考慮）
        const col = Math.floor((x - marginX) / keySize)
        const row = Math.floor(y / keySize)

        logger.debug(
          `Touch calculation: x=${x}, marginX=${marginX}, keySize=${keySize} -> col=${col}, row=${row}`
        )

        // グリッドの範囲内かチェック
        if (col >= 0 && col < this.device.columns && row >= 0 && row < this.device.rows) {
          const id = row * this.device.columns + col
          logger.debug(`onTouch: calculated col=${col}, row=${row}, id=${id}`)
          callback({ id, col, row, x, y })
        } else {
          logger.debug(
            `Touch outside grid: col=${col}, row=${row} (max: ${this.device.columns}x${this.device.rows})`
          )
        }
      })
    })

    // 物理ボタンイベントはonTouch()では処理しない
    // （物理ボタンはmain.jsで別途処理）
  }

  /**
   * カスタムイベントハンドラーを追加
   * @param eventName - イベント名
   * @param callback - コールバック関数
   */
  on(eventName: string, callback: (data: unknown) => void | Promise<void>): void {
    if (!this.device) {
      logger.warn(`on: device is null, cannot register event handler for ${eventName}`)
      return
    }
    this.device.on(eventName, callback)
  }

  /**
   * デバイスを切断
   */
  async disconnect(): Promise<void> {
    if (!this.device) {
      return
    }

    try {
      logger.info('デバイスを切断中...')

      // イベントリスナーを削除
      if (typeof this.device.removeAllListeners === 'function') {
        this.device.removeAllListeners()
        logger.debug('イベントリスナーを削除しました')
      }

      // デバイスのクローズ処理（タイムアウト付き）
      if (typeof this.device.close === 'function') {
        await Promise.race([
          this.device.close(),
          new Promise((resolve) =>
            setTimeout(() => {
              logger.warn('デバイスのクローズがタイムアウトしました')
              resolve(undefined)
            }, 2000)
          ),
        ])
        logger.debug('device.close() 完了')
      }

      this.device = null
      this.vibration = null
      logger.info('✓ デバイスの切断が完了しました')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`デバイスの切断中にエラーが発生しました: ${message}`)
      // エラーが発生してもデバイスをnullにする
      this.device = null
      this.vibration = null
    }
  }

  /**
   * 終了処理のセットアップ
   * @param cleanupCallback - 終了時のクリーンアップ関数
   */
  setupExitHandlers(cleanupCallback?: () => void | Promise<void>): void {
    let isExiting = false

    const exitHandler = async (signal: string) => {
      // 重複実行を防ぐ
      if (isExiting) {
        return
      }
      isExiting = true

      logger.info(`\n終了シグナルを受信しました (${signal})...`)

      try {
        // 全クリーンアップ処理にタイムアウトを設定（5秒）
        await Promise.race([
          (async () => {
            // クリーンアップコールバックを実行
            if (cleanupCallback) {
              logger.debug('クリーンアップコールバックを実行中...')
              await cleanupCallback()
            }

            // デバイスを切断
            await this.disconnect()
          })(),
          new Promise((resolve) =>
            setTimeout(() => {
              logger.warn('クリーンアップ処理がタイムアウトしました（強制終了）')
              resolve(undefined)
            }, 5000)
          ),
        ])

        logger.info('✓ 正常に終了しました')

        // プロセスを即座に終了
        process.exit(0)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error(`終了処理中にエラーが発生しました: ${message}`)
        process.exit(1)
      }
    }

    // 既存のハンドラーを削除（tsx watchでの再起動時の重複を防ぐ）
    process.removeAllListeners('SIGINT')
    process.removeAllListeners('SIGTERM')

    // 新しいハンドラーを登録
    process.on('SIGINT', () => exitHandler('SIGINT'))
    process.on('SIGTERM', () => exitHandler('SIGTERM'))
  }

  /**
   * デバイスオブジェクトを取得
   * @returns デバイスオブジェクト
   */
  getDevice(): LoupedeckDeviceType | null {
    return this.device
  }

  /**
   * 振動ユーティリティを取得
   * @returns 振動ユーティリティ
   */
  getVibration(): VibrationUtil | null {
    return this.vibration
  }

  /**
   * 物理ボタンのLED色を設定
   * @param buttonId - ボタンID (0-3)
   * @param color - 色（例: 'red', '#FF0000', 'rgb(255,0,0)'）
   */
  async setButtonColor(buttonId: number, color: string): Promise<void> {
    if (!this.device) {
      logger.warn('デバイスが接続されていません')
      return
    }

    try {
      logger.debug(`ボタン ${buttonId} の色を設定中: ${color}`)

      // タイムアウト付きでLED色を設定（2秒）
      await Promise.race([
        this.device.setButtonColor({ id: buttonId, color }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('タイムアウト')), 2000)),
      ])

      logger.debug(`ボタン ${buttonId} の色を設定完了: ${color}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      logger.warn(`ボタン ${buttonId} の色設定に失敗（スキップ）: ${message}`)
    }
  }

  /**
   * 複数の物理ボタンのLED色を一括設定
   * @param colorMap - { buttonId: colorString, ... }
   */
  async setButtonColors(colorMap: Record<number, string>): Promise<void> {
    for (const [buttonId, color] of Object.entries(colorMap)) {
      await this.setButtonColor(Number(buttonId), color)
      // 各ボタン設定の間に少し待機
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  /**
   * デバイス情報を表示
   */
  showDeviceInfo(): void {
    if (!this.device) {
      logger.warn('showDeviceInfo: device is null')
      return
    }

    logger.info('\nデバイス情報:')
    logger.info(`  タイプ: ${this.device.type}`)
    logger.info(`  ボタン数: ${this.device.buttons.length}`)
    logger.info(`  ノブ数: ${this.device.knobs.length}`)
    logger.info(`  グリッド: ${this.device.columns}列 x ${this.device.rows}行`)
    logger.info(`  キーサイズ: ${this.device.keySize}x${this.device.keySize}px`)
    logger.info('')
  }
}
