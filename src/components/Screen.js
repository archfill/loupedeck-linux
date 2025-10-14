/**
 * Loupedeck画面の基底クラス
 * グリッド描画と画面全体の管理を担当
 */
export class Screen {
  /**
   * @param {Object} device - Loupedeckデバイスオブジェクト
   */
  constructor(device) {
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
   * @param {CanvasRenderingContext2D} ctx - Canvas描画コンテキスト
   * @param {string} strokeColor - グリッド線の色
   */
  drawGrid(ctx, strokeColor = '#222222') {
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
   * @param {number} col - 列番号
   * @param {number} row - 行番号
   * @returns {Object} { x, y, width, height }
   */
  getCellCoordinates(col, row) {
    return {
      x: this.marginX + col * this.keySize,
      y: row * this.keySize,
      width: this.keySize,
      height: this.keySize,
    }
  }

  /**
   * 背景をクリア
   * @param {CanvasRenderingContext2D} ctx - Canvas描画コンテキスト
   * @param {string} bgColor - 背景色
   */
  clearBackground(ctx, bgColor = '#000000') {
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)
  }

  /**
   * 画面全体を描画（サブクラスでオーバーライド）
   * @param {CanvasRenderingContext2D} ctx - Canvas描画コンテキスト
   */
  draw(ctx) {
    this.clearBackground(ctx)
    this.drawGrid(ctx)
  }

  /**
   * 画面を更新
   */
  async update() {
    await this.device.drawScreen('center', (ctx) => {
      this.draw(ctx)
    })
  }
}
