import { loadImage } from 'canvas'
import { logger } from './logger.js'
import fs from 'fs'
import path from 'path'

/**
 * 画像キャッシュ
 */
const imageCache = new Map()

/**
 * 画像を読み込む
 * @param {string} imagePath - 画像ファイルのパス（絶対パスまたはプロジェクトルートからの相対パス）
 * @returns {Promise<Image>} 読み込まれた画像オブジェクト
 */
export async function loadImageFile(imagePath) {
  // キャッシュをチェック
  if (imageCache.has(imagePath)) {
    logger.debug(`画像をキャッシュから取得: ${imagePath}`)
    return imageCache.get(imagePath)
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
  } catch (error) {
    logger.error(`画像の読み込みに失敗しました: ${imagePath} - ${error.message}`)
    throw error
  }
}

/**
 * 画像キャッシュをクリア
 * @param {string} imagePath - クリアする画像パス（省略時は全てクリア）
 */
export function clearImageCache(imagePath = null) {
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
 * @param {CanvasRenderingContext2D} ctx - Canvas描画コンテキスト
 * @param {Image} image - 描画する画像
 * @param {number} x - X座標
 * @param {number} y - Y座標
 * @param {number} width - 幅
 * @param {number} height - 高さ
 * @param {boolean} keepAspectRatio - アスペクト比を保持するか（デフォルト: true）
 */
export function drawImage(ctx, image, x, y, width, height, keepAspectRatio = true) {
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
  } catch (error) {
    logger.error(`画像の描画に失敗しました: ${error.message}`)
  }
}

export default { loadImageFile, clearImageCache, drawImage }
