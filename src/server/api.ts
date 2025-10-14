import express, { type Application, type Request, type Response } from 'express'
import cors from 'cors'
import type { Server } from 'http'
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
} from '../config/components.ts'
import {
  AUTO_UPDATE_INTERVAL_MS,
  BUTTON_LED_COLORS,
  KNOB_IDS,
  VOLUME_STEP_PERCENT,
  VOLUME_DISPLAY_TIMEOUT_MS,
} from '../config/constants.ts'

/**
 * APIサーバークラス
 */
export class ApiServer {
  private port: number
  private app: Application
  private server: Server | null

  constructor(port: number = 3000) {
    this.port = port
    this.app = express()
    this.server = null
    this.setupMiddleware()
    this.setupRoutes()
  }

  /**
   * ミドルウェアのセットアップ
   */
  private setupMiddleware(): void {
    // CORS設定（開発環境用）
    this.app.use(cors())
    this.app.use(express.json())
  }

  /**
   * ルートのセットアップ
   */
  private setupRoutes(): void {
    // ヘルスチェック
    this.app.get('/api/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })

    // 全設定取得
    this.app.get('/api/config', (_req: Request, res: Response) => {
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
          knobs: ['knobTL', 'knobCL'] as const,
          buttons: [0, 1, 2, 3] as const,
        },
      })
    })

    // コンポーネント設定取得
    this.app.get('/api/config/components', (_req: Request, res: Response) => {
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
    this.app.get('/api/config/constants', (_req: Request, res: Response) => {
      res.json({
        autoUpdateInterval: AUTO_UPDATE_INTERVAL_MS,
        buttonLedColors: BUTTON_LED_COLORS,
        knobIds: KNOB_IDS,
        volumeStep: VOLUME_STEP_PERCENT,
        volumeDisplayTimeout: VOLUME_DISPLAY_TIMEOUT_MS,
      })
    })

    // デバイス情報取得
    this.app.get('/api/device', (_req: Request, res: Response) => {
      res.json({
        type: 'Loupedeck Live S',
        grid: { columns: 5, rows: 3 },
        knobs: ['knobTL', 'knobCL'] as const,
        buttons: [0, 1, 2, 3] as const,
      })
    })

    // 404ハンドラー
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({ error: 'Not Found' })
    })
  }

  /**
   * サーバー起動
   */
  start(): Promise<void> {
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
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        // タイムアウトを設定（5秒）
        const timeout = setTimeout(() => {
          logger.warn('APIサーバーの停止がタイムアウトしました（強制終了）')
          resolve()
        }, 5000)

        this.server.close(() => {
          clearTimeout(timeout)
          logger.info('APIサーバーを停止しました')
          resolve()
        })

        // 既存の接続を強制的に閉じる
        this.server.closeAllConnections?.()
      } else {
        resolve()
      }
    })
  }
}
