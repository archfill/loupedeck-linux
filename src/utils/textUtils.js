/**
 * テキストのフォントサイズを自動調整する
 * @param {CanvasRenderingContext2D} ctx - Canvas描画コンテキスト
 * @param {string} text - 表示するテキスト
 * @param {number} maxWidth - 最大幅（px）
 * @param {number} initialSize - 初期フォントサイズ（px）
 * @param {number} minSize - 最小フォントサイズ（px）
 * @param {string} fontStyle - フォントスタイル（例: 'bold', ''）
 * @param {string} fontFamily - フォントファミリー（例: 'sans-serif'）
 * @returns {number} 調整後のフォントサイズ
 */
export function autoSizeText(
  ctx,
  text,
  maxWidth,
  initialSize = 24,
  minSize = 12,
  fontStyle = '',
  fontFamily = 'sans-serif'
) {
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
 * 日付フォーマット
 * @param {Date} date - Date オブジェクト
 * @returns {string} MM/DD 形式の日付
 */
export function formatDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}/${day}`
}

/**
 * 時刻フォーマット
 * @param {Date} date - Date オブジェクト
 * @param {boolean} showSeconds - 秒を表示するか
 * @returns {string} HH:MM:SS または HH:MM 形式の時刻
 */
export function formatTime(date, showSeconds = true) {
  const options = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }

  if (showSeconds) {
    options.second = '2-digit'
  }

  return date.toLocaleTimeString('ja-JP', options)
}
