import express, { type Application, type Request, type Response } from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync, renameSync, existsSync, rmSync } from 'fs'
import type { Server } from 'http'
import { logger } from '../utils/logger.js'
import {
  clearConfigCache,
  ConfigSchema,
  loadConfig,
  convertToPageConfig,
} from '../config/configLoader.ts'
import { ZodError } from 'zod'
import { IconResolver } from '../utils/iconResolver.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import { pagesConfig } from '../config/pages.ts'
import {
  AUTO_UPDATE_INTERVAL_MS,
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
      // 動的にconfig.jsonから読み込む
      const config = loadConfig()
      const pages = convertToPageConfig(config)

      // pagesを_meta付きの形式に変換
      const pagesWithMeta: Record<number, any> = {}
      Object.entries(pages).forEach(([pageNum, pageConfig]) => {
        pagesWithMeta[Number(pageNum)] = {
          _meta: pageConfig.meta,
          ...pageConfig.components,
        }
      })

      res.json({
        pages: pagesWithMeta,
        // 後方互換性のため、全コンポーネントのフラットリストも提供
        components: pages[1]?.components || {},
        constants: {
          autoUpdateInterval: AUTO_UPDATE_INTERVAL_MS,
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

    // アイコン解決（Web UIプレビュー用）
    this.app.get('/api/icon/resolve/:appName', (req: Request, res: Response) => {
      const { appName } = req.params
      if (!appName) {
        return res.status(400).json({ error: 'appName is required' })
      }

      try {
        const iconPath = IconResolver.resolve(appName, 64)
        if (iconPath) {
          res.json({ appName, iconPath })
        } else {
          res.status(404).json({ error: 'Icon not found', appName })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error(`Failed to resolve icon for ${appName}: ${message}`)
        res.status(500).json({ error: 'Internal server error', appName })
      }
    })

    // アイコンファイル配信（Web UIプレビュー用）
    this.app.get('/api/icon/file', (req: Request, res: Response) => {
      const { path: iconPath } = req.query
      if (!iconPath || typeof iconPath !== 'string') {
        return res.status(400).json({ error: 'path parameter is required' })
      }

      // セキュリティ: パスが/usr/share/iconsまたは/opt/homebrew以下であることを確認
      if (
        !iconPath.startsWith('/usr/share/icons/') &&
        !iconPath.startsWith('/opt/homebrew/') &&
        !iconPath.startsWith('/usr/local/share/icons/')
      ) {
        return res.status(403).json({ error: 'Forbidden: invalid path' })
      }

      res.sendFile(iconPath, (err) => {
        if (err) {
          logger.error(`Failed to send icon file: ${iconPath}`)
          res.status(404).json({ error: 'File not found', iconPath })
        }
      })
    })

    // 設定の保存 (POST)
    this.app.post('/api/config', (req: Request, res: Response) => {
      let tempPath: string | null = null
      try {
        const updatedPages = req.body

        // Zodでバリデーション（異常値の永続化を防止）
        const validatedConfig = ConfigSchema.parse({ pages: updatedPages })

        // 設定ファイルパス
        const configPath = path.resolve(process.cwd(), 'config/config.json')
        tempPath = configPath + '.tmp'

        // 一時ファイルに書き込み（クラッシュ時の破損防止）
        writeFileSync(tempPath, JSON.stringify(validatedConfig, null, 2), 'utf-8')

        // atomic rename（アトミックな書き込み）
        renameSync(tempPath, configPath)

        // キャッシュをクリア
        clearConfigCache()

        logger.info('✓ Configuration saved to config.json')
        res.json({
          success: true,
          message: 'Configuration saved successfully and will be applied automatically.',
        })
      } catch (error: unknown) {
        if (tempPath && existsSync(tempPath)) {
          try {
            rmSync(tempPath)
          } catch (cleanupError) {
            const cleanupMessage =
              cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
            logger.warn(`Failed to cleanup temp config file: ${cleanupMessage}`)
          }
        }

        const message = error instanceof Error ? error.message : String(error)
        logger.error(`Failed to save configuration: ${message}`)

        // Zodバリデーションエラーの場合は400
        if (error instanceof ZodError) {
          res.status(400).json({
            success: false,
            message: 'Validation error',
            issues: error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          })
          return
        }

        const errno = error as NodeJS.ErrnoException
        if (errno?.code === 'EACCES' || errno?.code === 'EPERM') {
          res.status(500).json({
            success: false,
            message: 'Failed to save configuration: permission denied',
          })
          return
        }

        res.status(500).json({
          success: false,
          message: `Failed to save configuration: ${message}`,
        })
      }
    })

    // 静的ファイル配信（Web UI） - APIルートの後に配置
    // 環境変数または__dirnameからプロジェクトルートを特定
    const projectRoot = process.env.LOUPEDECK_PROJECT_ROOT || path.resolve(__dirname, '../../..')
    const webDistPath = path.join(projectRoot, 'apps/web/dist')
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
      // 127.0.0.1のみにバインド（他端末からのアクセスを防止）
      this.server = this.app.listen(this.port, '127.0.0.1', () => {
        logger.info(`🌐 APIサーバーが起動しました: http://localhost:${this.port}`)
        logger.info(`   - 設定確認: http://localhost:${this.port}/api/config`)
        logger.info(`   - セキュリティ: 127.0.0.1のみにバインドされています`)
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
