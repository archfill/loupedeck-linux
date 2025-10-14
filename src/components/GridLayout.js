import { Screen } from './Screen.js'
import { logger } from '../utils/logger.js'

/**
 * グリッドレイアウトマネージャー
 * 複数のコンポーネントを管理して画面全体を描画
 */
export class GridLayout extends Screen {
  constructor(device) {
    super(device)
    this.components = []
    this.componentMap = new Map() // col_row -> component のマップ
  }

  /**
   * コンポーネントを追加
   * @param {Object} component - 追加するコンポーネント（Clock, Buttonなど）
   */
  addComponent(component) {
    this.components.push(component)

    // 位置情報を持つコンポーネントの場合、マップに登録
    if (component.col !== undefined && component.row !== undefined) {
      const key = `${component.col}_${component.row}`
      this.componentMap.set(key, component)
      logger.debug(
        `Component registered: ${component.label || component.constructor.name} at (${component.col},${component.row}) with key=${key}`
      )
    }
  }

  /**
   * 複数のコンポーネントを追加
   * @param {Array} components - コンポーネントの配列
   */
  addComponents(components) {
    components.forEach((component) => this.addComponent(component))
  }

  /**
   * すべてのコンポーネントを描画
   * @param {CanvasRenderingContext2D} ctx - Canvas描画コンテキスト
   */
  draw(ctx) {
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
   * @param {number} touchedCol - タッチされた列
   * @param {number} touchedRow - タッチされた行
   * @returns {Promise<boolean>} いずれかのコンポーネントが処理したか
   */
  async handleTouch(touchedCol, touchedRow) {
    const key = `${touchedCol}_${touchedRow}`
    const component = this.componentMap.get(key)

    logger.debug(`GridLayout.handleTouch: key=${key}, component found=${!!component}`)

    if (component && typeof component.handleTouch === 'function') {
      logger.debug(
        `Calling component.handleTouch for ${component.label || component.constructor.name}`
      )
      return await component.handleTouch(touchedCol, touchedRow)
    }

    logger.debug('No component found for this position')
    return false
  }

  /**
   * 自動更新を開始
   * @param {number} interval - 更新間隔（ミリ秒）
   * @returns {number} インターバルID
   */
  startAutoUpdate(interval = 1000) {
    // 初回描画
    this.update()

    // 定期更新
    return setInterval(async () => {
      try {
        await this.update()
      } catch (error) {
        logger.error(`描画エラー: ${error.message}`)
      }
    }, interval)
  }

  /**
   * 自動更新を停止
   * @param {number} intervalId - インターバルID
   */
  stopAutoUpdate(intervalId) {
    clearInterval(intervalId)
  }

  /**
   * コンポーネントの数を取得
   * @returns {number} コンポーネント数
   */
  getComponentCount() {
    return this.components.length
  }
}
