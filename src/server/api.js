import express from 'express'
import cors from 'cors'
import { logger } from '../utils/logger.js'
import {
  clockConfig,
  firefoxButtonConfig,
  onePasswordButtonConfig,
  thunderbirdButtonConfig,
  volumeDisplayConfig,
  mediaDisplayConfig,
  workspaceSetupButtonConfig,
  onePasswordUnlockButtonConfig,
} from '../config/components.js'
import {
  AUTO_UPDATE_INTERVAL_MS,
  BUTTON_LED_COLORS,
  KNOB_IDS,
  VOLUME_STEP_PERCENT,
  VOLUME_DISPLAY_TIMEOUT_MS,
} from '../config/constants.js'

/**
 * APIサーバークラス
 */
export class ApiServer {
  constructor(port = 3000) {
    this.port = port
    this.app = express()
    this.server = null
    this.setupMiddleware()
    this.setupRoutes()
  }

  /**
   * ミドルウェアのセットアップ
   */
  setupMiddleware() {
    // CORS設定（開発環境用）
    this.app.use(cors())
    this.app.use(express.json())
  }

  /**
   * ルートのセットアップ
   */
  setupRoutes() {
    // ヘルスチェック
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })

    // 全設定取得
    this.app.get('/api/config', (req, res) => {
      res.json({
        components: {
          clock: clockConfig,
          firefoxButton: firefoxButtonConfig,
          onePasswordButton: onePasswordButtonConfig,
          thunderbirdButton: thunderbirdButtonConfig,
          volumeDisplay: volumeDisplayConfig,
          mediaDisplay: mediaDisplayConfig,
          workspaceSetupButton: workspaceSetupButtonConfig,
          onePasswordUnlockButton: onePasswordUnlockButtonConfig,
        },
        constants: {
          autoUpdateInterval: AUTO_UPDATE_INTERVAL_MS,
          buttonLedColors: BUTTON_LED_COLORS,
          knobIds: KNOB_IDS,
          volumeStep: VOLUME_STEP_PERCENT,
          volumeDisplayTimeout: VOLUME_DISPLAY_TIMEOUT_MS,
        },
        device: {
          type: 'Loupedeck Live S',
          grid: { columns: 5, rows: 3 },
          knobs: ['knobTL', 'knobCL'],
          buttons: [0, 1, 2, 3],
        },
      })
    })

    // コンポーネント設定取得
    this.app.get('/api/config/components', (req, res) => {
      res.json({
        clock: clockConfig,
        firefoxButton: firefoxButtonConfig,
        onePasswordButton: onePasswordButtonConfig,
        thunderbirdButton: thunderbirdButtonConfig,
        volumeDisplay: volumeDisplayConfig,
        mediaDisplay: mediaDisplayConfig,
        workspaceSetupButton: workspaceSetupButtonConfig,
        onePasswordUnlockButton: onePasswordUnlockButtonConfig,
      })
    })

    // 定数設定取得
    this.app.get('/api/config/constants', (req, res) => {
      res.json({
        autoUpdateInterval: AUTO_UPDATE_INTERVAL_MS,
        buttonLedColors: BUTTON_LED_COLORS,
        knobIds: KNOB_IDS,
        volumeStep: VOLUME_STEP_PERCENT,
        volumeDisplayTimeout: VOLUME_DISPLAY_TIMEOUT_MS,
      })
    })

    // デバイス情報取得
    this.app.get('/api/device', (req, res) => {
      res.json({
        type: 'Loupedeck Live S',
        grid: { columns: 5, rows: 3 },
        knobs: ['knobTL', 'knobCL'],
        buttons: [0, 1, 2, 3],
      })
    })

    // 404ハンドラー
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not Found' })
    })
  }

  /**
   * サーバー起動
   */
  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        logger.info(`🌐 APIサーバーが起動しました: http://localhost:${this.port}`)
        logger.info(`   - 設定確認: http://localhost:${this.port}/api/config`)
        resolve()
      })
    })
  }

  /**
   * サーバー停止
   */
  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('APIサーバーを停止しました')
          resolve()
        })
      } else {
        resolve()
      }
    })
  }
}
