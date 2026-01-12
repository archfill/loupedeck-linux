import { useState, useEffect, useMemo } from 'react'
import type { ComponentConfig } from '../types/config'
import { IconPicker } from './IconPicker.tsx'

interface ComponentEditorProps {
  component: ComponentConfig
  name: string
  pageNum: number
  onClose: () => void
  onSave: (updatedComponent: ComponentConfig) => void
  onDelete?: () => void
}

// NerdFont Icon Selector Component
interface NerdFontIconSelectorProps {
  currentIcon?: string
  onSelect: (icon: string | null) => void
}

function NerdFontIconSelector({ currentIcon, onSelect }: NerdFontIconSelectorProps) {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div className="flex gap-3 items-center">
      {/* Current Icon Display / Picker Button */}
      <button
        onClick={() => setShowPicker(true)}
        className="w-16 h-16 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center text-4xl hover:border-blue-500 transition-colors nerd-font"
        title={currentIcon || 'アイコンを選択'}
      >
        {currentIcon || '+'}
      </button>

      {/* Icon Preview Text */}
      <div className="flex-1">
        <div className="text-sm text-gray-400">
          {currentIcon ? (
            <span className="text-white">{currentIcon}</span>
          ) : (
            <span>アイコンを選択してください</span>
          )}
        </div>
      </div>

      {/* Clear Button */}
      {currentIcon && (
        <button
          onClick={() => onSelect(null)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          クリア
        </button>
      )}

      {/* IconPicker Modal */}
      {showPicker && (
        <IconPicker
          currentIcon={currentIcon}
          onSelect={(icon) => {
            onSelect(icon)
            setShowPicker(false)
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}

export function ComponentEditor({
  component,
  name,
  onClose,
  onSave,
  onDelete,
}: ComponentEditorProps) {
  const [editedComponent, setEditedComponent] = useState(component)

  useEffect(() => {
    setEditedComponent(component)
  }, [component])

  // 物理ボタンかどうかを判定（positionが-1,-1）
  const isPhysicalButton = component.position?.col === -1 && component.position?.row === -1

  const handleSave = () => {
    onSave(editedComponent)
    onClose()
  }

  const updateField = (path: string[], value: unknown) => {
    const newComponent = { ...editedComponent }
    let current: Record<string, unknown> = newComponent

    // Navigate to the nested property
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i]
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key] as Record<string, unknown>
    }

    // Set the value
    current[path[path.length - 1]] = value
    setEditedComponent(newComponent as ComponentConfig)

    // bgColorが変更された場合、borderColorも同じ色に自動反映
    if (path.join('.') === 'options.bgColor' && typeof value === 'string') {
      let optionsCurrent = (newComponent.options as Record<string, unknown>) || {}
      optionsCurrent = { ...optionsCurrent, borderColor: value }
      newComponent.options = optionsCurrent
      setEditedComponent(newComponent as ComponentConfig)
    }

    // 物理ボタンでLED色を変更した場合、bgColorとborderColorも同じ色に更新
    if (isPhysicalButton && path.join('.') === 'options.ledColor' && typeof value === 'string') {
      let optionsCurrent = (newComponent.options as Record<string, unknown>) || {}
      optionsCurrent = { ...optionsCurrent, bgColor: value, borderColor: value }
      newComponent.options = optionsCurrent
      setEditedComponent(newComponent as ComponentConfig)
    }

    // iconが設定された場合、iconImageをクリア（排他制御）
    if (path.join('.') === 'options.icon') {
      let optionsCurrent = (newComponent.options as Record<string, unknown>) || {}
      delete optionsCurrent.iconImage
      newComponent.options = optionsCurrent
      setEditedComponent(newComponent as ComponentConfig)
    }

    // iconImageが設定された場合、iconをクリア（排他制御）
    if (path.join('.') === 'options.iconImage') {
      let optionsCurrent = (newComponent.options as Record<string, unknown>) || {}
      delete optionsCurrent.icon
      newComponent.options = optionsCurrent
      setEditedComponent(newComponent as ComponentConfig)
    }

    // commandが変更された場合、appNameが空なら自動的にcommandの最初の単語をappNameに設定
    if (path.join('.') === 'command' && typeof value === 'string') {
      const currentAppName = newComponent.appName as string | undefined
      if (!currentAppName) {
        const firstWord = value.split(' ')[0]
        newComponent.appName = firstWord
        setEditedComponent(newComponent as ComponentConfig)
      }
    }
  }

  const getField = (path: string[]): any => {
    let current: Record<string, unknown> | undefined = editedComponent
    for (const key of path) {
      if (current && typeof current === 'object' && key in current) {
        const next = current[key]
        if (next && typeof next === 'object') {
          current = next as Record<string, unknown>
        } else {
          return next
        }
      } else {
        return undefined
      }
    }
    return current
  }

  // iconTypeが未設定の場合、既存のフィールドから推測
  const getIconType = useMemo(() => {
    const iconType = getField(['options', 'iconType'])
    if (iconType) return iconType
    if (getField(['options', 'icon'])) return 'nerdfont'
    if (getField(['options', 'iconImage'])) return 'image'
    return 'none'
  }, [editedComponent])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Edit Component</h2>
            <p className="text-gray-400 mt-1">{name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Icon Section - 物理ボタン以外で表示 */}
          {!isPhysicalButton && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">アイコン</label>

              {/* Icon Type Selector */}
              <select
                value={getIconType}
                onChange={(e) => {
                  const newType = e.target.value
                  // iconTypeが変更されたとき、他のアイコン設定をクリア（iconTypeは維持）
                  const newComponent = { ...editedComponent }
                  let optionsCurrent = (newComponent.options as Record<string, unknown>) || {}
                  optionsCurrent = {
                    ...optionsCurrent,
                    iconType: newType,
                    icon: undefined,
                    iconImage: undefined,
                  }
                  newComponent.options = optionsCurrent
                  setEditedComponent(newComponent as ComponentConfig)
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white mb-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">なし</option>
                <option value="nerdfont">NerdFont アイコン</option>
                <option value="auto">自動解決（アプリ名）</option>
                <option value="image">画像ファイル</option>
              </select>

              {/* Conditional Fields */}
              {getIconType === 'nerdfont' && (
                <NerdFontIconSelector
                  currentIcon={getField(['options', 'icon'])}
                  onSelect={(icon) => updateField(['options', 'icon'], icon)}
                />
              )}

              {getIconType === 'auto' && (
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">
                    <span className="text-yellow-500">ℹ️</span> アプリ名（appName）
                  </label>
                  <input
                    type="text"
                    value={getField(['appName']) || ''}
                    onChange={(e) => updateField(['appName'], e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="例: google-chrome, firefox"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    コマンドから自動設定されますが、手動で変更も可能です
                    {getField(['appName']) && (
                      <span className="text-gray-400 ml-2">（現在: {getField(['appName'])}）</span>
                    )}
                  </p>
                </div>
              )}

              {getIconType === 'image' && (
                <input
                  type="text"
                  value={getField(['options', 'iconImage']) || ''}
                  onChange={(e) => updateField(['options', 'iconImage'], e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="/path/to/icon.png"
                />
              )}
            </div>
          )}

          {/* Label - 物理ボタン以外で表示 */}
          {!isPhysicalButton && getField(['options', 'label']) !== undefined && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">Label</label>
              <input
                type="text"
                value={getField(['options', 'label']) || ''}
                onChange={(e) => updateField(['options', 'label'], e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Background Color - 物理ボタン以外で表示 */}
          {!isPhysicalButton && getField(['options', 'bgColor']) !== undefined && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">
                Background Color
              </label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={getField(['options', 'bgColor']) || '#000000'}
                  onChange={(e) => updateField(['options', 'bgColor'], e.target.value)}
                  className="w-16 h-10 rounded cursor-pointer bg-gray-800 border border-gray-700"
                />
                <input
                  type="text"
                  value={getField(['options', 'bgColor']) || ''}
                  onChange={(e) => updateField(['options', 'bgColor'], e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="#RRGGBB"
                />
              </div>
            </div>
          )}

          {/* Text Color - 物理ボタン以外で表示 */}
          {!isPhysicalButton && getField(['options', 'textColor']) !== undefined && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">Text Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={getField(['options', 'textColor']) || '#FFFFFF'}
                  onChange={(e) => updateField(['options', 'textColor'], e.target.value)}
                  className="w-16 h-10 rounded cursor-pointer bg-gray-800 border border-gray-700"
                />
                <input
                  type="text"
                  value={getField(['options', 'textColor']) || ''}
                  onChange={(e) => updateField(['options', 'textColor'], e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="#RRGGBB"
                />
              </div>
            </div>
          )}

          {/* LED Color */}
          {getField(['options', 'ledColor']) !== undefined && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">LED Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={getField(['options', 'ledColor']) || '#000000'}
                  onChange={(e) => updateField(['options', 'ledColor'], e.target.value)}
                  className="w-16 h-10 rounded cursor-pointer bg-gray-800 border border-gray-700"
                />
                <input
                  type="text"
                  value={getField(['options', 'ledColor']) || ''}
                  onChange={(e) => updateField(['options', 'ledColor'], e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="#RRGGBB"
                />
              </div>
            </div>
          )}

          {/* Command */}
          {getField(['command']) !== undefined && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">Command</label>
              <input
                type="text"
                value={getField(['command']) || ''}
                onChange={(e) => updateField(['command'], e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="command to execute"
              />
            </div>
          )}

          {/* Icon Size */}
          {getField(['options', 'iconSize']) !== undefined && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">
                Icon Size: {getField(['options', 'iconSize'])}px
              </label>
              <input
                type="range"
                min="24"
                max="72"
                step="4"
                value={getField(['options', 'iconSize']) || 48}
                onChange={(e) => updateField(['options', 'iconSize'], Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          {/* Position (Read-only for now) */}
          {getField(['position']) && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">
                Position (Read-only)
              </label>
              <div className="flex gap-4">
                <div className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-500">
                  Col: {getField(['position', 'col'])}
                </div>
                <div className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-500">
                  Row: {getField(['position', 'row'])}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Position editing coming in Phase 3</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-6 flex justify-between items-center">
          {onDelete && (
            <button
              onClick={() => {
                onDelete()
              }}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold"
            >
              🗑️ 削除
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
