import { useEffect, useRef, useState } from 'react'

interface Component {
  position?: { col: number; row: number }
  appName?: string
  options?: {
    label?: string
    bgColor?: string
    borderColor?: string
    textColor?: string
    icon?: string
    iconSize?: number
  }
  command?: string
}

interface PageMeta {
  title: string
  description: string
}

interface PageData {
  _meta?: PageMeta
  [key: string]: Component | PageMeta | undefined
}

interface LoupedeckPreviewProps {
  components?: Record<string, Component>
  pages?: Record<string, PageData>
  device?: {
    type?: string
    grid?: { columns: number; rows: number }
    knobs?: string[]
    buttons?: number[]
  }
}

export function LoupedeckPreview({ components, pages, device }: LoupedeckPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const columns = device?.grid?.columns || 5
  const rows = device?.grid?.rows || 3
  const cellSize = 90
  const screenWidth = columns * cellSize
  const screenHeight = rows * cellSize

  // ページに応じたコンポーネントを取得
  const displayComponents = pages && pages[currentPage]
    ? pages[currentPage]
    : components

  // 型ガード: Componentかどうかを判定
  const isComponent = (value: Component | PageMeta | undefined): value is Component => {
    return value !== undefined && 'position' in value && value.position !== undefined
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 背景をクリア
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, screenWidth, screenHeight)

    // グリッドを描画
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 1
    for (let col = 0; col <= columns; col++) {
      ctx.beginPath()
      ctx.moveTo(col * cellSize, 0)
      ctx.lineTo(col * cellSize, screenHeight)
      ctx.stroke()
    }
    for (let row = 0; row <= rows; row++) {
      ctx.beginPath()
      ctx.moveTo(0, row * cellSize)
      ctx.lineTo(screenWidth, row * cellSize)
      ctx.stroke()
    }

    // ページ2の場合はワークスペースボタンを描画
    if (currentPage === 2) {
      // ワークスペース1-10を描画
      for (let i = 1; i <= 10; i++) {
        const col = i <= 5 ? i - 1 : i - 6
        const row = i <= 5 ? 1 : 2
        const x = col * cellSize
        const y = row * cellSize

        // セルの背景
        ctx.fillStyle = '#1a3a5a'
        ctx.fillRect(x, y, cellSize, cellSize)

        // セルの枠線
        ctx.strokeStyle = '#3a6a9a'
        ctx.lineWidth = 2
        ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2)

        // ワークスペース番号
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 32px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(i), x + cellSize / 2, y + cellSize / 2)

        // ラベル
        ctx.font = 'bold 10px sans-serif'
        ctx.textBaseline = 'bottom'
        ctx.fillText(`WS ${i}`, x + cellSize / 2, y + cellSize - 8)
      }
    } else {
      // ページ1: 通常のコンポーネントを描画
      if (displayComponents) {
        Object.entries(displayComponents).forEach(([, component]) => {
          // 型ガードで Component 型のみを処理
          if (!isComponent(component)) return

          const { col, row } = component.position!
          const x = col * cellSize
          const y = row * cellSize
          const options = component.options || {}

          // セルの背景
          ctx.fillStyle = options.bgColor || '#2a4a6a'
          ctx.fillRect(x, y, cellSize, cellSize)

          // セルの枠線
          ctx.strokeStyle = options.borderColor || '#4a7a9a'
          ctx.lineWidth = 2
          ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2)

          // アイコン（絵文字）
          if (options.icon) {
            ctx.font = `${options.iconSize || 32}px sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(options.icon, x + cellSize / 2, y + cellSize / 2 - 8)
          }

          // ラベル
          if (options.label) {
            ctx.fillStyle = options.textColor || '#FFFFFF'
            ctx.font = 'bold 12px sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'bottom'

            // テキストを短縮
            let label = options.label
            if (label.length > 10) {
              label = label.substring(0, 10) + '...'
            }

            const textY = options.icon ? y + cellSize - 8 : y + cellSize / 2
            ctx.fillText(label, x + cellSize / 2, textY)
          }
        })
      }
    }
  }, [displayComponents, currentPage, columns, rows, screenWidth, screenHeight, cellSize])

  return (
    <div className="space-y-4">
      {/* Page selector dropdown */}
      {pages && (
        <div className="flex items-center justify-center gap-4">
          <label htmlFor="page-select" className="text-gray-400 text-sm font-medium">
            Page:
          </label>
          <select
            id="page-select"
            value={currentPage}
            onChange={(e) => setCurrentPage(Number(e.target.value))}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-750 transition-colors"
          >
            {Object.keys(pages).map((pageNum) => {
              const num = Number(pageNum)
              const pageMeta = pages[num]._meta
              return (
                <option key={pageNum} value={pageNum}>
                  Page {pageNum}: {pageMeta?.title || `Page ${pageNum}`}
                </option>
              )
            })}
          </select>
          {pages[currentPage]?._meta && (
            <span className="text-gray-500 text-sm italic">
              {pages[currentPage]._meta.description}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-center gap-8 p-8 bg-gray-900 rounded-2xl">
        {/* Left side - Knobs and Button */}
        <div className="flex flex-col gap-6">
          {/* Top left knob */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-gray-800 border-4 border-gray-700 flex items-center justify-center shadow-lg">
              <div className="w-2 h-6 bg-gray-600 rounded-full"></div>
            </div>
            <span className="text-xs text-gray-400 mt-2">VOL</span>
          </div>

          {/* Center left knob */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-gray-800 border-4 border-gray-700 flex items-center justify-center shadow-lg">
              <div className="w-2 h-6 bg-gray-600 rounded-full"></div>
            </div>
            <span className="text-xs text-gray-400 mt-2">PAGE</span>
          </div>

          {/* Physical button - ID 0 (bottom left) */}
          <div className="flex flex-col items-center mt-4">
            <div className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-gray-700"></div>
            </div>
            <span className="text-xs text-gray-400 mt-2">BTN 0</span>
          </div>
        </div>

        {/* Center screen */}
        <div className="relative">
          <div className="bg-black p-4 rounded-lg shadow-2xl border-4 border-gray-800">
            <canvas
              ref={canvasRef}
              width={screenWidth}
              height={screenHeight}
              className="rounded"
            />
          </div>
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-500">
            {screenWidth} × {screenHeight}px
          </div>
        </div>

        {/* Right side - Physical Buttons */}
        <div className="flex flex-col gap-6 justify-center">
          {/* Physical button - ID 1 */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-red-500 shadow-lg flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-red-700"></div>
            </div>
            <span className="text-xs text-gray-400 mt-2">BTN 1</span>
          </div>

          {/* Physical button - ID 2 */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-green-500 shadow-lg flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-green-700"></div>
            </div>
            <span className="text-xs text-gray-400 mt-2">BTN 2</span>
          </div>

          {/* Physical button - ID 3 */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-blue-500 shadow-lg flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-blue-700"></div>
            </div>
            <span className="text-xs text-gray-400 mt-2">BTN 3</span>
          </div>
        </div>
      </div>
    </div>
  )
}
