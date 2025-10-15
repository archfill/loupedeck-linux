import { Screen } from './Screen.ts'
import { logger } from '../utils/logger.ts'

/**
 * Canvas描画コンテキストの型
 */
type CanvasRenderingContext2D = any

/**
 * グリッドコンポーネントのインターフェース
 */
interface GridComponent {
  col?: number
  row?: number
  label?: string
  draw: (ctx: CanvasRenderingContext2D, cellCoord?: any) => void
  handleTouch?: (touchedCol: number, touchedRow: number) => Promise<boolean> | boolean
}

/**
 * グリッドレイアウトマネージャー
 * 複数のコンポーネントを管理して画面全体を描画
 */
export class GridLayout extends Screen {
  private components: GridComponent[]
  private componentMap: Map<string, GridComponent[]>

  constructor(device: any) {
    super(device)
    this.components = []
    this.componentMap = new Map() // col_row -> components[] のマップ（複数対応）
  }

  /**
   * コンポーネントを追加
   * @param component - 追加するコンポーネント（Clock, Buttonなど）
   */
  addComponent(component: GridComponent): void {
    this.components.push(component)

    // 位置情報を持つコンポーネントの場合、マップに登録（複数対応）
    if (component.col !== undefined && component.row !== undefined) {
      const key = `${component.col}_${component.row}`
      const existing = this.componentMap.get(key) || []
      existing.push(component)
      this.componentMap.set(key, existing)
      logger.debug(
        `Component registered: ${component.label || component.constructor.name} at (${component.col},${component.row}) with key=${key} (total: ${existing.length})`
      )
    }
  }

  /**
   * 複数のコンポーネントを追加
   * @param components - コンポーネントの配列
   */
  addComponents(components: GridComponent[]): void {
    components.forEach((component) => this.addComponent(component))
  }

  /**
   * すべてのコンポーネントを描画
   * @param ctx - Canvas描画コンテキスト
   */
  draw(ctx: CanvasRenderingContext2D): void {
    // 背景をクリア
    this.clearBackground(ctx)

    // グリッドを描画
    this.drawGrid(ctx)

    // 各コンポーネントを描画
    this.components.forEach((component) => {
      if (component.col !== undefined && component.row !== undefined) {
        // 単一セルコンポーネント（Button、Clockなど）
        const cellCoord = this.getCellCoordinates(component.col, component.row)
        component.draw(ctx, cellCoord)
      } else {
        // 全画面コンポーネント
        component.draw(ctx)
      }
    })
  }

  /**
   * タッチイベントを処理
   * @param touchedCol - タッチされた列
   * @param touchedRow - タッチされた行
   * @returns いずれかのコンポーネントが処理したか
   */
  async handleTouch(touchedCol: number, touchedRow: number): Promise<boolean> {
    const key = `${touchedCol}_${touchedRow}`
    const components = this.componentMap.get(key)

    logger.debug(`GridLayout.handleTouch: key=${key}, components found=${components?.length || 0}`)

    if (components && components.length > 0) {
      // 後から追加されたコンポーネント（上に重なっているもの）から順に処理
      for (let i = components.length - 1; i >= 0; i--) {
        const component = components[i]

        if (typeof component.handleTouch === 'function') {
          logger.debug(
            `Calling component.handleTouch for ${component.label || component.constructor.name} (layer ${i})`
          )
          const handled = await component.handleTouch(touchedCol, touchedRow)

          // コンポーネントがイベントを処理した場合は終了
          if (handled) {
            return true
          }

          logger.debug(`Component ${component.label || component.constructor.name} did not handle touch, trying next layer`)
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
      } catch (error: any) {
        logger.error(`描画エラー: ${error.message}`)
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
   * コンポーネントの数を取得
   * @returns コンポーネント数
   */
  getComponentCount(): number {
    return this.components.length
  }
}
