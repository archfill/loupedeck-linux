import type { LoupedeckDevice } from 'loupedeck'
import type { CanvasRenderingContext2D } from 'canvas'

/**
 * セル座標
 */
export interface CellCoord {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Loupedeck画面の基底クラス
 * グリッド描画と画面全体の管理を担当
 */
export class Screen {
  protected device: LoupedeckDevice
  protected screenWidth: number
  protected screenHeight: number
  protected keySize: number
  protected columns: number
  protected rows: number
  protected totalWidth: number
  protected marginX: number

  /**
   * @param device - Loupedeckデバイスオブジェクト
   */
  constructor(device: LoupedeckDevice) {
    this.device = device
    this.screenWidth = device.displays.center.width
    this.screenHeight = device.displays.center.height
    this.keySize = device.keySize
    this.columns = device.columns
    this.rows = device.rows
    this.totalWidth = this.keySize * this.columns
    this.marginX = (this.screenWidth - this.totalWidth) / 2
  }

  /**
   * グリッドを描画
   * @param ctx - Canvas描画コンテキスト
   * @param strokeColor - グリッド線の色
   */
  drawGrid(ctx: CanvasRenderingContext2D, strokeColor: string = '#222222'): void {
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = 1

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.columns; c++) {
        const x = this.marginX + c * this.keySize
        const y = r * this.keySize
        ctx.strokeRect(x, y, this.keySize, this.keySize)
      }
    }
  }

  /**
   * セルの座標を計算
   * @param col - 列番号
   * @param row - 行番号
   * @returns { x, y, width, height }
   */
  getCellCoordinates(col: number, row: number): CellCoord {
    return {
      x: this.marginX + col * this.keySize,
      y: row * this.keySize,
      width: this.keySize,
      height: this.keySize,
    }
  }

  /**
   * 背景をクリア
   * @param ctx - Canvas描画コンテキスト
   * @param bgColor - 背景色
   */
  clearBackground(ctx: CanvasRenderingContext2D, bgColor: string = '#000000'): void {
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)
  }

  /**
   * 画面全体を描画（サブクラスでオーバーライド）
   * @param ctx - Canvas描画コンテキスト
   */
  draw(ctx: CanvasRenderingContext2D): void {
    this.clearBackground(ctx)
    this.drawGrid(ctx)
  }

  /**
   * 画面を更新
   */
  async update(): Promise<void> {
    await this.device.drawScreen('center', (ctx: CanvasRenderingContext2D) => {
      this.draw(ctx)
    })
  }
}
