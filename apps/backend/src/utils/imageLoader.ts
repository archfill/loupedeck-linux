import { loadImage, Image, CanvasRenderingContext2D } from 'canvas'
import { logger } from './logger.ts'
import fs from 'fs'
import path from 'path'

/**
 * 画像キャッシュ
 */
const imageCache = new Map<string, Image>()

/**
 * 画像を読み込む
 * @param imagePath - 画像ファイルのパス（絶対パスまたはプロジェクトルートからの相対パス）
 * @returns 読み込まれた画像オブジェクト
 */
export async function loadImageFile(imagePath: string): Promise<Image> {
  // キャッシュをチェック
  if (imageCache.has(imagePath)) {
    logger.debug(`画像をキャッシュから取得: ${imagePath}`)
    return imageCache.get(imagePath)!
  }

  try {
    // 相対パスの場合、プロジェクトルートからの絶対パスに変換
    let absolutePath = imagePath
    if (!path.isAbsolute(imagePath)) {
      absolutePath = path.resolve(process.cwd(), imagePath)
    }

    // ファイルの存在確認
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`画像ファイルが見つかりません: ${absolutePath}`)
    }

    logger.debug(`画像を読み込み中: ${absolutePath}`)
    const image = await loadImage(absolutePath)
    logger.debug(
      `画像を読み込みました: ${path.basename(absolutePath)} (${image.width}x${image.height})`
    )

    // キャッシュに保存
    imageCache.set(imagePath, image)

    return image
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`画像の読み込みに失敗しました: ${imagePath} - ${message}`)
    throw error
  }
}

/**
 * 画像キャッシュをクリア
 * @param imagePath - クリアする画像パス（省略時は全てクリア）
 */
export function clearImageCache(imagePath?: string): void {
  if (imagePath) {
    imageCache.delete(imagePath)
    logger.debug(`画像キャッシュをクリア: ${imagePath}`)
  } else {
    imageCache.clear()
    logger.debug('すべての画像キャッシュをクリアしました')
  }
}

/**
 * 画像を指定サイズにリサイズして描画
 * @param ctx - Canvas描画コンテキスト
 * @param image - 描画する画像
 * @param x - X座標
 * @param y - Y座標
 * @param width - 幅
 * @param height - 高さ
 * @param keepAspectRatio - アスペクト比を保持するか（デフォルト: true）
 */
export function drawImage(
  ctx: CanvasRenderingContext2D,
  image: Image,
  x: number,
  y: number,
  width: number,
  height: number,
  keepAspectRatio: boolean = true
): void {
  if (!image) {
    logger.warn('drawImage: 画像がnullです')
    return
  }

  try {
    if (keepAspectRatio) {
      // アスペクト比を保持してリサイズ
      const scale = Math.min(width / image.width, height / image.height)
      const scaledWidth = image.width * scale
      const scaledHeight = image.height * scale

      // 中央揃え
      const offsetX = (width - scaledWidth) / 2
      const offsetY = (height - scaledHeight) / 2

      ctx.drawImage(image, x + offsetX, y + offsetY, scaledWidth, scaledHeight)
    } else {
      // アスペクト比を無視してリサイズ
      ctx.drawImage(image, x, y, width, height)
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`画像の描画に失敗しました: ${message}`)
  }
}

export default { loadImageFile, clearImageCache, drawImage }
