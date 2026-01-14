import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2 } from 'lucide-react'
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import type { ComponentConfig, PageData, PageMeta, Device } from '../types/config'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/**
 * 色の明度を調整するヘルパー関数
 * @param hex - 16進色コード (#RRGGBB)
 * @param amount - 調整量 (-100 から 100、負の値で暗く、正の値で明るく)
 * @returns 調整後の16進色コード
 */
function adjustBrightness(hex: string, amount: number): string {
  // #を削除
  const color = hex.replace('#', '')

  // RGBを抽出
  const r = Number.parseInt(color.substring(0, 2), 16)
  const g = Number.parseInt(color.substring(2, 4), 16)
  const b = Number.parseInt(color.substring(4, 6), 16)

  // 明度を調整
  const adjust = (value: number) => {
    const adjusted = value + (amount * 255) / 100
    return Math.max(0, Math.min(255, Math.round(adjusted)))
  }

  const newR = adjust(r)
  const newG = adjust(g)
  const newB = adjust(b)

  // 16進数に変換して返す
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

// 型エイリアス（後方互換性のため）
type Component = ComponentConfig

interface LoupedeckPreviewProps {
  components?: Record<string, ComponentConfig>
  pages?: Record<string, PageData>
  device?: Device
  onPositionChange?: (
    componentName: string,
    pageNum: number,
    newCol: number,
    newRow: number
  ) => void
  onSwapComponents?: (componentName1: string, componentName2: string, pageNum: number) => void
  onEditComponent?: (componentName: string, pageNum: number) => void
  onAddPage?: () => void
  onDeletePage?: (pageNum: number) => void
  onEditPageMeta?: (pageNum: number) => void
}

// ドラッグ&ドロップ可能なコンポーネント - 改善版
function DraggableComponent({
  component,
  name,
  cellSize,
  onClick,
  resolvedIcons,
}: {
  component: Component
  name: string
  cellSize: number
  onClick?: () => void
  resolvedIcons: Record<string, string>
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: name,
    data: { type: 'component', component, name },
  })

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `component-${name}`,
    data: { type: 'component', componentName: name },
  })

  // 両方のrefを結合
  const setRefs = (element: HTMLDivElement | null) => {
    setDragRef(element)
    setDropRef(element)
  }

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.8 : 1,
        scale: isDragging ? 1.05 : 1,
      }
    : {}

  const options = component.options || {}

  const handleClick = (e: React.MouseEvent) => {
    // ドラッグ中でない場合のみクリックイベントを発火
    if (!isDragging && onClick) {
      e.stopPropagation()
      onClick()
    }
  }

  return (
    <div
      ref={setRefs}
      style={{
        ...style,
        width: cellSize,
        height: cellSize,
        backgroundColor: options.bgColor || '#2a4a6a',
        borderColor: isOver ? 'hsl(var(--primary))' : options.borderColor || '#4a7a9a',
        borderWidth: isOver ? '3px' : '2px',
        borderStyle: 'solid',
        cursor: 'pointer',
        position: 'relative',
        zIndex: 10,
        boxShadow: isDragging
          ? '0 0 30px hsl(var(--primary) / 0.5), 0 0 60px hsl(var(--primary) / 0.3)'
          : '0 2px 8px rgba(0, 0, 0, 0.3)',
      }}
      className="flex flex-col items-center justify-center rounded"
      onClick={handleClick}
      {...listeners}
      {...attributes}
    >
      {/* Icon Display Priority: iconImage > resolved icon (auto) > icon > none */}
      {options.iconImage && (
        <img
          src={options.iconImage}
          alt="icon"
          style={{ width: options.iconSize || 48, height: options.iconSize || 48 }}
          className="object-contain"
          onError={(e) => {
            // 画像読み込み失敗時は非表示
            e.currentTarget.style.display = 'none'
          }}
        />
      )}
      {!options.iconImage && options.iconType === 'auto' && resolvedIcons[name] && (
        <img
          src={`/api/icon/file?path=${encodeURIComponent(resolvedIcons[name])}`}
          alt="icon"
          style={{ width: options.iconSize || 48, height: options.iconSize || 48 }}
          className="object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      )}
      {!options.iconImage && options.iconType !== 'auto' && options.icon && (
        <div className="nerd-font" style={{ fontSize: options.iconSize || 32 }}>
          {options.icon}
        </div>
      )}
      {options.label && (
        <div
          style={{ color: options.textColor || '#FFFFFF', fontSize: '12px', fontWeight: 'bold' }}
          className="drop-shadow-md"
        >
          {options.label.length > 10 ? options.label.substring(0, 10) + '...' : options.label}
        </div>
      )}
    </div>
  )
}

// ドロップ可能なセル - 改善版
function DroppableCell({ col, row, cellSize }: { col: number; row: number; cellSize: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${col}-${row}`,
    data: { type: 'cell', col, row },
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        width: cellSize,
        height: cellSize,
        border: '1px dashed hsl(var(--border))',
        backgroundColor: isOver ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--muted) / 0.3)',
        pointerEvents: 'auto',
        transition: 'all 0.2s ease',
        boxShadow: isOver ? 'inset 0 0 20px hsl(var(--primary) / 0.3)' : 'none',
      }}
      className={isOver ? 'animate-pulse' : ''}
    />
  )
}

export function LoupedeckPreview({
  components,
  pages,
  device,
  onPositionChange,
  onSwapComponents,
  onEditComponent,
  onAddPage,
  onDeletePage,
  onEditPageMeta,
}: LoupedeckPreviewProps) {
  const { t } = useTranslation()
  const [currentPage, setCurrentPage] = useState(1)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [resolvedIcons, setResolvedIcons] = useState<Record<string, string>>({})
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  // ドラッグとクリックを区別するためのセンサー設定
  // 5px以上移動したときのみドラッグとみなす
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  const columns = device?.grid?.columns || 5
  const rows = device?.grid?.rows || 3
  const cellSize = 90
  const screenWidth = columns * cellSize
  const screenHeight = rows * cellSize

  // ページに応じたコンポーネントを取得（文字列キーでアクセス）
  const pageKey = String(currentPage)
  const allComponents = pages && pages[pageKey] ? pages[pageKey] : components

  // 全てのコンポーネントを表示（_meta、volumeDisplay、mediaDisplay、notificationDisplay、物理ボタンは除外）
  const displayComponents: Record<string, Component> = useMemo(() => {
    const result: Record<string, Component> = {}
    if (allComponents) {
      Object.entries(allComponents).forEach(([key, value]) => {
        if (
          key !== '_meta' &&
          key !== 'volumeDisplay' &&
          key !== 'mediaDisplay' &&
          key !== 'notificationDisplay' &&
          value &&
          typeof value === 'object' &&
          'position' in value &&
          value.position !== undefined &&
          value.position.col >= 0 &&
          value.position.row >= 0
        ) {
          result[key] = value as Component
        }
      })
    }
    return result
  }, [allComponents])

  // iconType="auto"のコンポーネントのアイコンを解決
  useEffect(() => {
    const resolveIcons = async () => {
      const results: Record<string, string> = {}
      console.log('>>> Resolving icons for displayComponents:', Object.keys(displayComponents))
      for (const [name, component] of Object.entries(displayComponents)) {
        console.log(
          `>>> Checking ${name}: iconType=${component.options?.iconType}, appName=${component.appName}`
        )
        if (component.options?.iconType === 'auto' && component.appName) {
          try {
            const res = await fetch(`/api/icon/resolve/${component.appName}`)
            if (res.ok) {
              const data = (await res.json()) as { appName: string; iconPath: string }
              if (data.iconPath) {
                results[name] = data.iconPath
                console.log(`>>> Resolved ${name}: ${data.iconPath}`)
              }
            } else {
              console.error(`>>> Failed to resolve ${name}: HTTP ${res.status}`)
            }
          } catch (e) {
            console.error(`Failed to resolve icon for ${name}:`, e)
          }
        }
      }
      console.log('>>> Setting resolvedIcons:', results)
      setResolvedIcons(results)
    }
    resolveIcons()
  }, [displayComponents])

  // 型ガード: Componentかどうかを判定
  const isComponent = (value: Component | PageMeta | undefined): value is Component => {
    return value !== undefined && 'position' in value && value.position !== undefined
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const draggedData = active.data.current as { type: string; name: string; component: Component }
    const dropData = over.data.current as {
      type: string
      col?: number
      row?: number
      componentName?: string
    }

    console.log('=== Drag End Debug ===')
    console.log('Dragged:', draggedData)
    console.log('Drop target:', dropData)

    if (!draggedData || !dropData) return

    // ケース1: コンポーネントを別のコンポーネントの上にドロップ → 入れ替え
    if (dropData.type === 'component' && dropData.componentName && onSwapComponents) {
      if (draggedData.name !== dropData.componentName) {
        console.log('Swapping components:', draggedData.name, dropData.componentName)
        onSwapComponents(draggedData.name, dropData.componentName, currentPage)
      }
    }
    // ケース2: コンポーネントを空のセルにドロップ → 移動
    else if (
      dropData.type === 'cell' &&
      dropData.col !== undefined &&
      dropData.row !== undefined &&
      onPositionChange
    ) {
      console.log('Moving component to:', dropData.col, dropData.row)
      onPositionChange(draggedData.name, currentPage, dropData.col, dropData.row)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page selector dropdown and actions */}
      {pages && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap p-4 rounded-lg bg-muted border">
          <div className="flex items-center gap-3">
            <label
              htmlFor="page-select"
              className="text-muted-foreground text-sm font-semibold uppercase tracking-wide"
            >
              {t('preview.pageSelector')}:
            </label>
            <Select
              value={String(currentPage)}
              onValueChange={(value) => setCurrentPage(Number(value))}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(pages).map((pageNum) => {
                  const pageMeta = pages[pageNum]._meta
                  return (
                    <SelectItem key={pageNum} value={pageNum}>
                      {t('preview.pageSelector')} {pageNum}:{' '}
                      {pageMeta?.title || `${t('preview.pageSelector')} ${pageNum}`}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          {pages[pageKey]?._meta && (
            <span className="text-muted-foreground text-sm italic px-3 py-1 rounded bg-muted">
              {pages[pageKey]._meta.description}
            </span>
          )}

          {/* Page action buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button type="button" variant="default" onClick={() => onAddPage?.()} size="sm">
              <Plus className="h-4 w-4 mr-2" /> {t('preview.pageActions.add')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onEditPageMeta?.(currentPage)}
              size="sm"
            >
              <Edit className="h-4 w-4 mr-2" /> {t('preview.pageActions.editMeta')}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setDeleteConfirmOpen(true)
              }}
              disabled={Object.keys(pages).length <= 1}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" /> {t('preview.pageActions.delete')}
            </Button>
          </div>
        </div>
      )}

      {/* Device preview container - Enhanced with glassmorphism */}
      <div className="flex items-center justify-center gap-8 p-10 rounded-lg bg-muted border">
        {/* Left side - Knobs and Button */}
        <div className="flex flex-col gap-8">
          {/* Top left knob - volumeDisplay */}
          <Button
            type="button"
            onClick={() => {
              if (onEditComponent && allComponents?.volumeDisplay) {
                onEditComponent('volumeDisplay', currentPage)
              }
            }}
            variant="ghost"
            className="h-auto w-auto p-0 flex flex-col items-center gap-3"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-card to-muted border-4 border-foreground/10 ring-1 ring-foreground/10 flex items-center justify-center shadow-md">
              <div className="w-2 h-8 rounded-full bg-foreground/30"></div>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {t('preview.physicalButtons.vol')}
            </span>
          </Button>

          {/* Center left knob - mediaDisplay */}
          <Button
            type="button"
            onClick={() => {
              if (onEditComponent && allComponents?.mediaDisplay) {
                onEditComponent('mediaDisplay', currentPage)
              }
            }}
            variant="ghost"
            className="h-auto w-auto p-0 flex flex-col items-center gap-3"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-card to-muted border-4 border-foreground/10 ring-1 ring-foreground/10 flex items-center justify-center shadow-md">
              <div className="w-2 h-8 rounded-full bg-foreground/30"></div>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {t('preview.physicalButtons.page')}
            </span>
          </Button>

          {/* Physical button - ID 0 (bottom left) */}
          <Button
            type="button"
            onClick={() => {
              if (onEditComponent && allComponents?.button0) {
                onEditComponent('button0', currentPage)
              }
            }}
            variant="ghost"
            className="h-auto w-auto p-0 flex flex-col items-center gap-3 mt-4"
          >
            <div
              className="w-12 h-12 rounded-full shadow-xl flex items-center justify-center"
              style={{
                backgroundColor:
                  (allComponents?.button0 as Component)?.options?.ledColor || '#FFFFFF',
              }}
            >
              <div
                className="w-9 h-9 rounded-full"
                style={{
                  backgroundColor: adjustBrightness(
                    (allComponents?.button0 as Component)?.options?.ledColor || '#FFFFFF',
                    -40
                  ),
                }}
              ></div>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {t('preview.physicalButtons.btn', { id: 0 })}
            </span>
          </Button>
        </div>

        {/* Center screen - Enhanced with glow */}
        <div className="relative group">
          <div className="bg-card p-6 rounded-lg shadow border border-border">
            {/* 常時ドラッグ&ドロップ可能なHTMLグリッド */}
            <DndContext
              sensors={sensors}
              onDragEnd={handleDragEnd}
              onDragStart={(e) => setActiveId(e.active.id as string)}
              collisionDetection={closestCenter}
            >
              <div
                className="relative bg-muted/60 ring-1 ring-border shadow-inner"
                style={{
                  width: screenWidth,
                  height: screenHeight,
                }}
              >
                {/* グリッドセル (ドロップ可能) - 空のセルのみドロップ可能に */}
                {Array.from({ length: columns * rows }).map((_, index) => {
                  const col = index % columns
                  const row = Math.floor(index / columns)

                  // このセルにコンポーネントが配置されているかチェック
                  const isOccupied =
                    displayComponents &&
                    Object.values(displayComponents).some(
                      (comp) =>
                        isComponent(comp) &&
                        comp.position?.col === col &&
                        comp.position?.row === row
                    )

                  // コンポーネントが配置されているセルにはドロップセルを配置しない
                  if (isOccupied) return null

                  return (
                    <div
                      key={`${col}-${row}`}
                      className="absolute pointer-events-auto"
                      style={{
                        left: col * cellSize,
                        top: row * cellSize,
                        zIndex: 1,
                      }}
                    >
                      <DroppableCell col={col} row={row} cellSize={cellSize} />
                    </div>
                  )
                })}

                {/* コンポーネント (ドラッグ可能) */}
                {displayComponents &&
                  Object.entries(displayComponents)
                    .filter(([, comp]) => isComponent(comp))
                    .map(([name, component]) => {
                      if (!isComponent(component)) return null
                      const { col, row } = component.position!
                      return (
                        <div
                          key={name}
                          className="absolute"
                          style={{
                            left: col * cellSize,
                            top: row * cellSize,
                            zIndex: 10,
                          }}
                        >
                          <DraggableComponent
                            component={component}
                            name={name}
                            cellSize={cellSize}
                            onClick={() => onEditComponent && onEditComponent(name, currentPage)}
                            resolvedIcons={resolvedIcons}
                          />
                        </div>
                      )
                    })}
              </div>

              {/* ドラッグオーバーレイ */}
              <DragOverlay>
                {activeId &&
                displayComponents &&
                displayComponents[activeId] &&
                isComponent(displayComponents[activeId]) ? (
                  <DraggableComponent
                    component={displayComponents[activeId] as Component}
                    name={activeId}
                    cellSize={cellSize}
                    resolvedIcons={resolvedIcons}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground font-medium">
            <span className="text-primary">
              {t('preview.screenSize', { width: screenWidth, height: screenHeight })}
            </span>
            <span className="mx-2">•</span>
            <span className="text-secondary">{t('app.devicePreview.dragHint')}</span>
          </div>
        </div>

        {/* Right side - Physical Buttons - Enhanced */}
        <div className="flex flex-col gap-8 justify-center">
          {/* Physical button - ID 1 */}
          <Button
            type="button"
            onClick={() => {
              if (onEditComponent && allComponents?.button1) {
                onEditComponent('button1', currentPage)
              }
            }}
            variant="ghost"
            className="h-auto w-auto p-0 flex flex-col items-center gap-3"
          >
            <div
              className="w-12 h-12 rounded-full shadow-xl flex items-center justify-center"
              style={{
                backgroundColor:
                  (allComponents?.button1 as Component)?.options?.ledColor || '#FF0000',
              }}
            >
              <div
                className="w-9 h-9 rounded-full"
                style={{
                  backgroundColor: adjustBrightness(
                    (allComponents?.button1 as Component)?.options?.ledColor || '#FF0000',
                    -40
                  ),
                }}
              ></div>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {t('preview.physicalButtons.btn', { id: 1 })}
            </span>
          </Button>

          {/* Physical button - ID 2 */}
          <Button
            type="button"
            onClick={() => {
              if (onEditComponent && allComponents?.button2) {
                onEditComponent('button2', currentPage)
              }
            }}
            variant="ghost"
            className="h-auto w-auto p-0 flex flex-col items-center gap-3"
          >
            <div
              className="w-12 h-12 rounded-full shadow-xl flex items-center justify-center"
              style={{
                backgroundColor:
                  (allComponents?.button2 as Component)?.options?.ledColor || '#00FF00',
              }}
            >
              <div
                className="w-9 h-9 rounded-full"
                style={{
                  backgroundColor: adjustBrightness(
                    (allComponents?.button2 as Component)?.options?.ledColor || '#00FF00',
                    -40
                  ),
                }}
              ></div>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {t('preview.physicalButtons.btn', { id: 2 })}
            </span>
          </Button>

          {/* Physical button - ID 3 */}
          <Button
            type="button"
            onClick={() => {
              if (onEditComponent && allComponents?.button3) {
                onEditComponent('button3', currentPage)
              }
            }}
            variant="ghost"
            className="h-auto w-auto p-0 flex flex-col items-center gap-3"
          >
            <div
              className="w-12 h-12 rounded-full shadow-xl flex items-center justify-center"
              style={{
                backgroundColor:
                  (allComponents?.button3 as Component)?.options?.ledColor || '#0000FF',
              }}
            >
              <div
                className="w-9 h-9 rounded-full"
                style={{
                  backgroundColor: adjustBrightness(
                    (allComponents?.button3 as Component)?.options?.ledColor || '#0000FF',
                    -40
                  ),
                }}
              ></div>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {t('preview.physicalButtons.btn', { id: 3 })}
            </span>
          </Button>
        </div>
      </div>

      {pages && (
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('preview.pageActions.deleteConfirm')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onDeletePage?.(currentPage)
                  setDeleteConfirmOpen(false)
                }}
              >
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
