import { discover } from 'loupedeck'
import { logger } from '../utils/logger.js'
import { VibrationUtil } from '../utils/vibration.js'

/**
 * Loupedeckデバイス管理クラス
 * デバイスの接続、イベント処理、終了処理を管理
 */
export class LoupedeckDevice {
  constructor() {
    this.device = null
    this.eventHandlers = {}
    this.vibration = null
  }

  /**
   * デバイスに接続
   * @returns {Promise<Object>} デバイスオブジェクト
   */
  async connect() {
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
    } catch (error) {
      logger.error(`✗ デバイスの接続に失敗しました: ${error.message}`)
      throw error
    }
  }

  /**
   * デフォルトのイベントハンドラーを設定
   */
  setupDefaultEventHandlers() {
    this.device.on('connect', () => {
      logger.info('✓ デバイスが接続されました')
    })

    this.device.on('disconnect', () => {
      logger.warn('✗ デバイスが切断されました')
      process.exit(0)
    })

    // すべてのイベントをデバッグログに出力
    const events = ['down', 'up', 'touchstart', 'touchmove', 'touchend', 'rotate']
    events.forEach((eventName) => {
      this.device.on(eventName, (data) => {
        logger.debug(`Device event: ${eventName}`, data)
      })
    })
  }

  /**
   * タッチイベントハンドラーを追加
   * @param {Function} callback - タッチイベントのコールバック関数
   */
  onTouch(callback) {
    logger.debug('onTouch handler registered for touchstart events')

    // 画面タッチイベント用（Loupedeck Live Sの画面）
    this.device.on('touchstart', ({ changedTouches }) => {
      logger.debug(`onTouch: 'touchstart' event fired`, changedTouches)

      if (!changedTouches || changedTouches.length === 0) {
        logger.warn('touchstart event has no changedTouches')
        return
      }

      changedTouches.forEach((touch) => {
        const { x, y, target } = touch
        logger.debug(`Touch at x=${x}, y=${y}, target=${target?.key}`)

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
   * @param {string} eventName - イベント名
   * @param {Function} callback - コールバック関数
   */
  on(eventName, callback) {
    this.device.on(eventName, callback)
  }

  /**
   * デバイスを切断
   */
  async disconnect() {
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

      // デバイスのクローズ処理
      if (typeof this.device.close === 'function') {
        await this.device.close()
        logger.debug('device.close() 完了')
      }

      this.device = null
      this.vibration = null
      logger.info('✓ デバイスの切断が完了しました')
    } catch (error) {
      logger.error(`デバイスの切断中にエラーが発生しました: ${error.message}`)
    }
  }

  /**
   * 終了処理のセットアップ
   * @param {Function} cleanupCallback - 終了時のクリーンアップ関数
   */
  setupExitHandlers(cleanupCallback) {
    let isExiting = false

    const exitHandler = async (signal) => {
      // 重複実行を防ぐ
      if (isExiting) {
        return
      }
      isExiting = true

      logger.info(`\n終了シグナルを受信しました (${signal})...`)

      try {
        // クリーンアップコールバックを実行
        if (cleanupCallback) {
          logger.debug('クリーンアップコールバックを実行中...')
          await cleanupCallback()
        }

        // デバイスを切断
        await this.disconnect()

        logger.info('✓ 正常に終了しました')
        process.exit(0)
      } catch (error) {
        logger.error(`終了処理中にエラーが発生しました: ${error.message}`)
        process.exit(1)
      }
    }

    // 既存のハンドラーを削除（node --watchでの再起動時の重複を防ぐ）
    process.removeAllListeners('SIGINT')
    process.removeAllListeners('SIGTERM')

    // 新しいハンドラーを登録
    process.on('SIGINT', () => exitHandler('SIGINT'))
    process.on('SIGTERM', () => exitHandler('SIGTERM'))
  }

  /**
   * デバイスオブジェクトを取得
   * @returns {Object} デバイスオブジェクト
   */
  getDevice() {
    return this.device
  }

  /**
   * 振動ユーティリティを取得
   * @returns {VibrationUtil} 振動ユーティリティ
   */
  getVibration() {
    return this.vibration
  }

  /**
   * デバイス情報を表示
   */
  showDeviceInfo() {
    logger.info('\nデバイス情報:')
    logger.info(`  タイプ: ${this.device.type}`)
    logger.info(`  ボタン数: ${this.device.buttons.length}`)
    logger.info(`  ノブ数: ${this.device.knobs.length}`)
    logger.info(`  グリッド: ${this.device.columns}列 x ${this.device.rows}行`)
    logger.info(`  キーサイズ: ${this.device.keySize}x${this.device.keySize}px`)
    logger.info('')
  }
}
