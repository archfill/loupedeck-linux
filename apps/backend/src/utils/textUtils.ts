import type { CanvasRenderingContext2D } from 'canvas'

/**
 * テキストのフォントサイズを自動調整する
 * @param ctx - Canvas描画コンテキスト
 * @param text - 表示するテキスト
 * @param maxWidth - 最大幅（px）
 * @param initialSize - 初期フォントサイズ（px）
 * @param minSize - 最小フォントサイズ（px）
 * @param fontStyle - フォントスタイル（例: 'bold', ''）
 * @param fontFamily - フォントファミリー（例: 'sans-serif'）
 * @returns 調整後のフォントサイズ
 */
export function autoSizeText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  initialSize: number = 24,
  minSize: number = 12,
  fontStyle: string = '',
  fontFamily: string = 'sans-serif'
): number {
  let fontSize = initialSize
  const style = fontStyle ? `${fontStyle} ` : ''

  ctx.font = `${style}${fontSize}px ${fontFamily}`
  let metrics = ctx.measureText(text)

  // テキストが幅を超える場合、フォントサイズを縮小
  while (metrics.width > maxWidth && fontSize > minSize) {
    fontSize -= 1
    ctx.font = `${style}${fontSize}px ${fontFamily}`
    metrics = ctx.measureText(text)
  }

  return fontSize
}

/**
 * テキストを省略する
 * @param text - 元のテキスト
 * @param maxLength - 最大文字数（...を含まない）
 * @returns 省略されたテキスト
 */
export function ellipsisText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength) + '...'
}

/**
 * 日付フォーマット
 * @param date - Date オブジェクト
 * @returns MM/DD 形式の日付
 */
export function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}/${day}`
}

/**
 * 時刻フォーマット
 * @param date - Date オブジェクト
 * @param showSeconds - 秒を表示するか
 * @returns HH:MM:SS または HH:MM 形式の時刻
 */
export function formatTime(date: Date, showSeconds: boolean = true): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }

  if (showSeconds) {
    options.second = '2-digit'
  }

  return date.toLocaleTimeString('ja-JP', options)
}
