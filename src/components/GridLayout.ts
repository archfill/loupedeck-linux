import { Screen, type CellCoord } from './Screen.ts'
import { logger } from '../utils/logger.ts'
import type { LoupedeckDevice } from 'loupedeck'
import type { CanvasRenderingContext2D } from 'canvas'

/**
 * グリッドコンポーネントのインターフェース
 */
interface GridComponent {
  col?: number
  row?: number
  label?: string
  draw: (ctx: CanvasRenderingContext2D, cellCoord: CellCoord) => void
  handleTouch?: (touchedCol: number, touchedRow: number) => Promise<boolean> | boolean
}

/**
 * グリッドレイアウトマネージャー
 * 複数のコンポーネントを管理して画面全体を描画
 * ページ機能をサポート
 */
export class GridLayout extends Screen {
  private pages: Map<number, GridComponent[]>
  private pageMaps: Map<number, Map<string, GridComponent[]>>
  private currentPage: number

  constructor(device: LoupedeckDevice) {
    super(device)
    this.pages = new Map() // pageNumber -> components[]
    this.pageMaps = new Map() // pageNumber -> (col_row -> components[])
    this.currentPage = 1

    // デフォルトでページ1を初期化
    this.pages.set(1, [])
    this.pageMaps.set(1, new Map())
  }

  /**
   * コンポーネントを追加
   * @param component - 追加するコンポーネント（Clock, Buttonなど）
   * @param page - ページ番号（デフォルト: 1）
   */
  addComponent(component: GridComponent, page: number = 1): void {
    // ページが存在しない場合は初期化
    if (!this.pages.has(page)) {
      this.pages.set(page, [])
      this.pageMaps.set(page, new Map())
    }

    const components = this.pages.get(page)!
    components.push(component)

    // 位置情報を持つコンポーネントの場合、マップに登録（複数対応）
    if (component.col !== undefined && component.row !== undefined) {
      const key = `${component.col}_${component.row}`
      const pageMap = this.pageMaps.get(page)!
      const existing = pageMap.get(key) || []
      existing.push(component)
      pageMap.set(key, existing)
      logger.debug(
        `Component registered on page ${page}: ${component.label || component.constructor.name} at (${component.col},${component.row}) with key=${key} (total: ${existing.length})`
      )
    }
  }

  /**
   * 複数のコンポーネントを追加
   * @param components - コンポーネントの配列
   * @param page - ページ番号（デフォルト: 1）
   */
  addComponents(components: GridComponent[], page: number = 1): void {
    components.forEach((component) => this.addComponent(component, page))
  }

  /**
   * 現在のページのすべてのコンポーネントを描画
   * @param ctx - Canvas描画コンテキスト
   */
  draw(ctx: CanvasRenderingContext2D): void {
    // 背景をクリア
    this.clearBackground(ctx)

    // グリッドを描画
    this.drawGrid(ctx)

    // 現在のページのコンポーネントを取得
    const components = this.pages.get(this.currentPage) || []

    // 各コンポーネントを描画
    components.forEach((component) => {
      if (component.col !== undefined && component.row !== undefined) {
        // 単一セルコンポーネント（Button、Clockなど）
        const cellCoord = this.getCellCoordinates(component.col, component.row)
        component.draw(ctx, cellCoord)
      }
    })
  }

  /**
   * タッチイベントを処理（現在のページのコンポーネントのみ）
   * @param touchedCol - タッチされた列
   * @param touchedRow - タッチされた行
   * @returns いずれかのコンポーネントが処理したか
   */
  async handleTouch(touchedCol: number, touchedRow: number): Promise<boolean> {
    const key = `${touchedCol}_${touchedRow}`
    const pageMap = this.pageMaps.get(this.currentPage)
    const components = pageMap?.get(key)

    logger.debug(
      `GridLayout.handleTouch: page=${this.currentPage}, key=${key}, components found=${components?.length || 0}`
    )

    if (components && components.length > 0) {
      // 後から追加されたコンポーネント（上に重なっているもの）から順に処理
      for (let i = components.length - 1; i >= 0; i--) {
        const component = components[i]

        if (!component) {
          continue
        }

        if (typeof component.handleTouch === 'function') {
          logger.debug(
            `Calling component.handleTouch for ${component.label || component.constructor.name} (layer ${i})`
          )
          const handled = await component.handleTouch(touchedCol, touchedRow)

          // コンポーネントがイベントを処理した場合は終了
          if (handled) {
            return true
          }

          logger.debug(
            `Component ${component.label || component.constructor.name} did not handle touch, trying next layer`
          )
        }
      }
    }

    logger.debug('No component handled this touch event')
    return false
  }

  /**
   * 自動更新を開始
   * @param interval - 更新間隔（ミリ秒）
   * @returns インターバルID
   */
  startAutoUpdate(interval: number = 1000): NodeJS.Timeout {
    // 初回描画
    this.update()

    // 定期更新
    return setInterval(async () => {
      try {
        await this.update()
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error(`描画エラー: ${message}`)
      }
    }, interval)
  }

  /**
   * 自動更新を停止
   * @param intervalId - インターバルID
   */
  stopAutoUpdate(intervalId: NodeJS.Timeout): void {
    clearInterval(intervalId)
  }

  /**
   * 現在のページのコンポーネントの数を取得
   * @returns コンポーネント数
   */
  getComponentCount(): number {
    const components = this.pages.get(this.currentPage) || []
    return components.length
  }

  /**
   * ページを切り替える
   * @param pageNumber - 切り替え先のページ番号
   */
  async switchPage(pageNumber: number): Promise<void> {
    if (pageNumber === this.currentPage) {
      logger.debug(`Already on page ${pageNumber}`)
      return
    }

    logger.info(`Switching from page ${this.currentPage} to page ${pageNumber}`)
    this.currentPage = pageNumber

    // ページが存在しない場合は初期化
    if (!this.pages.has(pageNumber)) {
      this.pages.set(pageNumber, [])
      this.pageMaps.set(pageNumber, new Map())
      logger.debug(`Initialized new page ${pageNumber}`)
    }

    // 画面を即座に更新
    await this.update()
  }

  /**
   * 現在のページ番号を取得
   * @returns 現在のページ番号
   */
  getCurrentPage(): number {
    return this.currentPage
  }

  /**
   * すべてのページ番号を取得
   * @returns ページ番号の配列
   */
  getAllPages(): number[] {
    return Array.from(this.pages.keys()).sort((a, b) => a - b)
  }
}
