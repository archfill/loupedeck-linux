import express, { type Application, type Request, type Response } from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync } from 'fs'
import type { Server } from 'http'
import { logger } from '../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import { pagesConfig } from '../config/pages.ts'
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

  constructor(port: number = 9876) {
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
      // pagesConfigを_meta付きの形式に変換
      const pages: Record<number, any> = {}
      Object.entries(pagesConfig).forEach(([pageNum, pageConfig]) => {
        pages[Number(pageNum)] = {
          _meta: pageConfig.meta,
          ...pageConfig.components,
        }
      })

      res.json({
        pages,
        // 後方互換性のため、全コンポーネントのフラットリストも提供
        components: pagesConfig[1]?.components || {},
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
      res.json(pagesConfig[1]?.components || {})
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

    // 設定の保存 (POST)
    this.app.post('/api/config', (req: Request, res: Response) => {
      try {
        const updatedPages = req.body

        // 既存のconfig.jsonを読み込んで更新
        const configPath = path.resolve(process.cwd(), 'config/config.json')
        const config = {
          pages: updatedPages,
        }

        // JSONファイルに書き込み
        writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')

        logger.info('✓ Configuration saved to config.json')
        res.json({
          success: true,
          message: 'Configuration saved successfully. Please restart the backend to apply changes.',
        })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error(`Failed to save configuration: ${message}`)
        res.status(500).json({
          success: false,
          message: `Failed to save configuration: ${message}`,
        })
      }
    })

    // 静的ファイル配信（Web UI） - APIルートの後に配置
    const webDistPath = path.join(__dirname, '../../web/dist')
    this.app.use(express.static(webDistPath))

    // SPAのフォールバック - 静的ファイルが見つからない場合はindex.htmlを返す
    this.app.use((_req: Request, res: Response) => {
      res.sendFile(path.join(webDistPath, 'index.html'))
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
        // タイムアウトを設定（2秒）
        const timeout = setTimeout(() => {
          logger.warn('APIサーバーの停止がタイムアウトしました（強制終了）')
          resolve()
        }, 2000)

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
