import { useEffect, useRef, useState } from 'react'
import { DndContext, useDroppable } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'

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
  type?: string
}

interface PageMeta {
  title: string
  description: string
}

interface PageData {
  _meta?: PageMeta
  [key: string]: Component | PageMeta | undefined
}

interface DraggablePreviewProps {
  pages?: Record<string, PageData>
  device?: {
    type?: string
    grid?: { columns: number; rows: number }
    knobs?: string[]
    buttons?: number[]
  }
  isEditMode?: boolean
  currentPage: number
  onPositionChange?: (componentName: string, newCol: number, newRow: number, pageNum: number) => void
}

// ドロップ可能なグリッドセル
function DroppableGridCell({ col, row, cellSize }: { col: number; row: number; cellSize: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${col}-${row}`,
    data: { col, row },
  })

  const x = col * cellSize
  const y = row * cellSize

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: cellSize,
        height: cellSize,
        border: '1px solid #333',
        backgroundColor: isOver ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
      }}
    />
  )
}

export function DraggablePreview({
  pages,
  device,
  isEditMode = false,
  currentPage,
  onPositionChange,
}: DraggablePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [components, setComponents] = useState<Record<string, Component>>({})

  const columns = device?.grid?.columns || 5
  const rows = device?.grid?.rows || 3
  const cellSize = 90
  const screenWidth = columns * cellSize
  const screenHeight = rows * cellSize

  // 現在のページのコンポーネントを取得
  useEffect(() => {
    if (pages && pages[currentPage]) {
      const pageData = pages[currentPage]
      const comps: Record<string, Component> = {}
      Object.entries(pageData).forEach(([key, value]) => {
        if (key !== '_meta' && value && typeof value === 'object' && 'position' in value) {
          comps[key] = value as Component
        }
      })
      setComponents(comps)
    }
  }, [pages, currentPage])

  // Canvas描画
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

    // コンポーネントを描画
    Object.entries(components).forEach(([_name, component]) => {
      if (!component.position) return

      const { col, row } = component.position
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

      // アイコン
      if (options.icon) {
        ctx.font = `${options.iconSize || 32}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = options.textColor || '#FFFFFF'
        ctx.fillText(options.icon, x + cellSize / 2, y + cellSize / 2 - 8)
      }

      // ラベル
      if (options.label) {
        ctx.fillStyle = options.textColor || '#FFFFFF'
        ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'

        let label = options.label
        if (label.length > 10) {
          label = label.substring(0, 10) + '...'
        }

        const textY = options.icon ? y + cellSize - 8 : y + cellSize / 2
        ctx.fillText(label, x + cellSize / 2, textY)
      }
    })
  }, [components, columns, rows, screenWidth, screenHeight, cellSize])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || !onPositionChange) return

    const draggedData = active.data.current as { name: string; col: number; row: number }
    const dropData = over.data.current as { col: number; row: number }

    if (draggedData && dropData) {
      onPositionChange(draggedData.name, dropData.col, dropData.row, currentPage)
    }
  }

  return (
    <div className="relative">
      <div className="bg-black p-4 rounded-lg shadow-2xl border-4 border-gray-800">
        <div className="relative">
          <canvas ref={canvasRef} width={screenWidth} height={screenHeight} className="rounded" />

          {/* ドラッグ&ドロップレイヤー（編集モード時のみ） */}
          {isEditMode && (
            <DndContext onDragEnd={handleDragEnd}>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: screenWidth,
                  height: screenHeight,
                  pointerEvents: 'auto',
                }}
              >
                {/* ドロップ可能なグリッドセル */}
                {Array.from({ length: columns }).map((_, col) =>
                  Array.from({ length: rows }).map((_, row) => (
                    <DroppableGridCell key={`${col}-${row}`} col={col} row={row} cellSize={cellSize} />
                  ))
                )}
              </div>
            </DndContext>
          )}
        </div>
      </div>
      <div className="text-center text-xs text-gray-500 mt-2">
        {screenWidth} × {screenHeight}px
        {isEditMode && <span className="ml-4 text-blue-400">ドラッグ&ドロップで位置変更</span>}
      </div>
    </div>
  )
}
