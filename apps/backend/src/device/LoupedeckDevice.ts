import fs from 'node:fs'
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

      // デバイスがコマンドを受け付けられるようになるまで待機
      await this.waitForDeviceReady()

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
    const deviceToClose = this.device
    if (!deviceToClose) {
      return
    }

    try {
      logger.info('デバイスを切断中...')

      // デバイスをクリア（画面とLEDをオフにする）
      await this.clearDevice()

      // イベントリスナーを削除
      if (typeof deviceToClose.removeAllListeners === 'function') {
        deviceToClose.removeAllListeners()
        logger.debug('イベントリスナーを削除しました')
      }

      // デバイスのクローズ処理（タイムアウト付き）
      if (typeof deviceToClose.close === 'function') {
        const closePromise = deviceToClose.close()
        this.device = null
        this.vibration = null
        await Promise.race([
          closePromise,
          new Promise((resolve) =>
            setTimeout(() => {
              logger.warn('デバイスのクローズがタイムアウトしました')
              resolve(undefined)
            }, 2000)
          ),
        ])
        logger.debug('device.close() 完了')
      } else {
        this.device = null
        this.vibration = null
      }

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
   * デバイスの画面とLEDをクリア
   */
  private async clearDevice(): Promise<void> {
    if (!this.device) {
      return
    }

    try {
      logger.debug('デバイスをクリア中...')

      // 全ボタンのLEDをオフ（黒色）
      const buttonPromises: Promise<void>[] = []
      for (let i = 0; i < 4; i++) {
        buttonPromises.push(
          this.device.setButtonColor({ id: i, color: '#000000' }).catch(() => {
            // エラーを無視（デバイスが既に切断されている場合がある）
          })
        )
      }
      await Promise.all(buttonPromises)
      logger.debug('ボタンLEDをオフにしました')

      // 全画面をクリア（黒色で塗りつぶし）
      const screens: Array<'left' | 'center' | 'right'> = ['center']
      if (this.device.screens.left) {
        screens.push('left')
      }
      if (this.device.screens.right) {
        screens.push('right')
      }

      for (const screen of screens) {
        await this.device
          .drawScreen(screen, (ctx) => {
            ctx.fillStyle = '#000000'
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
          })
          .catch(() => {
            // エラーを無視（デバイスが既に切断されている場合がある）
          })
      }
      logger.debug('全画面をクリアしました')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      logger.warn(`デバイスクリア中にエラーが発生しました（無視）: ${message}`)
    }
  }

  /**
   * デバイスがコマンドを受け付けられるようになるまで待機
   * 主に再起動時のUSBデバイス解放待ちに使用
   */
  private async waitForDeviceReady(maxAttempts = 10): Promise<void> {
    if (!this.device) {
      return
    }

    logger.debug('デバイスの準備完了を待機中...')

    // tsx watch modeの前回プロセスが終了するまで待機（最大30秒）
    logger.debug('前回のプロセス終了を待機中...')
    let deviceReadyFound = false
    for (let waitAttempt = 1; waitAttempt <= 30; waitAttempt++) {
      try {
        // テスト用にボタン0の色を設定してデバイスの使用可否をチェック
        await Promise.race([
          this.device.setButtonColor({ id: 0, color: '#000000' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('タイムアウト')), 1000)),
        ])
        // 成功したら待機終了
        logger.debug(`デバイスが使用可能になりました（待機 ${waitAttempt}回目）`)
        deviceReadyFound = true
        break
      } catch (error: unknown) {
        if (waitAttempt === 30) {
          logger.warn('前回のプロセス終了待機がタイムアウトしました（処理継続）')
        } else {
          // 1秒待機してリトライ
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }
    }

    // デバイス使用可能確認後、追加で5秒待機して完全な解放を待つ
    // （tsx watch modeは前回プロセスの終了に時間がかかる場合がある）
    if (deviceReadyFound) {
      logger.debug('デバイス解放完了を追加待機中...')
      await new Promise((resolve) => setTimeout(resolve, 5000))
      logger.debug('デバイスの準備が完了しました')
      return
    }

    // デバイス準備できなかった場合も警告して継続（LED設定でリトライ）
    logger.warn('デバイスの準備状態を確認できませんでした（処理継続）')
  }

  /**
   * 終了処理のセットアップ
   * @param cleanupCallback - 終了時のクリーンアップ関数
   */
  setupExitHandlers(cleanupCallback?: () => void | Promise<void>): void {
    let isExiting = false
    const pidFilePath = '/tmp/loupedeck-backend.pid'

    const readPidFile = (): number | null => {
      try {
        const raw = fs.readFileSync(pidFilePath, 'utf8').trim()
        const pid = Number(raw)
        if (!Number.isInteger(pid) || pid <= 0) {
          return null
        }
        return pid
      } catch {
        return null
      }
    }

    const isProcessAlive = (pid: number): boolean => {
      try {
        process.kill(pid, 0)
        return true
      } catch {
        return false
      }
    }

    const removePidFile = (): void => {
      try {
        if (fs.existsSync(pidFilePath)) {
          fs.unlinkSync(pidFilePath)
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        logger.warn(`PIDファイルの削除に失敗しました（無視）: ${message}`)
      }
    }

    const existingPid = readPidFile()
    if (existingPid && existingPid !== process.pid && isProcessAlive(existingPid)) {
      logger.warn(`既存プロセス (PID: ${existingPid}) が動作中のため待機します...`)
      const start = Date.now()
      const waitTimeoutMs = 5000
      const sleepMs = 250
      while (Date.now() - start < waitTimeoutMs) {
        const pid = readPidFile()
        if (!pid || !isProcessAlive(pid)) {
          break
        }
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, sleepMs)
      }

      const stillRunning = (() => {
        const pid = readPidFile()
        return pid ? isProcessAlive(pid) : false
      })()
      if (stillRunning) {
        logger.warn('既存プロセスが終了していないため起動をスキップします')
        process.exit(0)
        return
      }
    } else if (existingPid && existingPid !== process.pid && !isProcessAlive(existingPid)) {
      removePidFile()
    }

    try {
      fs.writeFileSync(pidFilePath, String(process.pid), { encoding: 'utf8' })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      logger.warn(`PIDファイルの作成に失敗しました（無視）: ${message}`)
    }

    process.once('exit', removePidFile)

    const exitHandler = async (signal: string) => {
      // 重複実行を防ぐ
      if (isExiting) {
        return
      }
      isExiting = true

      logger.info(`\n終了シグナルを受信しました (${signal})...`)
      const forceExitTimer = setTimeout(() => {
        logger.warn('クリーンアップ処理がタイムアウトしました（強制終了）')
        removePidFile()
        process.exit(0)
      }, 5000)

      try {
        // クリーンアップコールバックを実行
        if (cleanupCallback) {
          logger.debug('クリーンアップコールバックを実行中...')
          await cleanupCallback()
        }

        // デバイスを切断
        await this.disconnect()

        logger.info('✓ 正常に終了しました')

        // プロセスを即座に終了
        clearTimeout(forceExitTimer)
        removePidFile()
        process.exit(0)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error(`終了処理中にエラーが発生しました: ${message}`)
        clearTimeout(forceExitTimer)
        removePidFile()
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
   * 物理ボタンのLED色を設定（リトライ付き）
   * @param buttonId - ボタンID (0-3)
   * @param color - 色（例: 'red', '#FF0000', 'rgb(255,0,0)'）
   * @param maxRetries - 最大リトライ回数（デフォルト3回）
   */
  async setButtonColor(buttonId: number, color: string, maxRetries = 3): Promise<boolean> {
    if (!this.device) {
      logger.warn('デバイスが接続されていません')
      return false
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(
          `ボタン ${buttonId} の色を設定中: ${color}${attempt > 1 ? ` (リトライ ${attempt - 1}/${maxRetries - 1})` : ''}`
        )

        // タイムアウト付きでLED色を設定（5秒に延长）
        await Promise.race([
          this.device.setButtonColor({ id: buttonId, color }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('タイムアウト')), 5000)),
        ])

        logger.debug(`ボタン ${buttonId} の色を設定完了: ${color}`)
        return true
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)

        // 最後のリトライでも失敗した場合
        if (attempt === maxRetries) {
          logger.warn(`ボタン ${buttonId} の色設定に失敗（スキップ）: ${message}`)
          return false
        }

        // リトライ前に待機（デバイスの解放を待つ、3秒に延长）
        logger.debug(`ボタン ${buttonId} の色設定に失敗、3秒待機してリトライ: ${message}`)
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
    }

    return false
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
