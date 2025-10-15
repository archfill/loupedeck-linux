import { useState, useEffect } from 'react'

interface ComponentEditorProps {
  component: any
  name: string
  pageNum: number
  onClose: () => void
  onSave: (updatedComponent: any) => void
}

export function ComponentEditor({ component, name, onClose, onSave }: ComponentEditorProps) {
  const [editedComponent, setEditedComponent] = useState(component)

  useEffect(() => {
    setEditedComponent(component)
  }, [component])

  const handleSave = () => {
    onSave(editedComponent)
    onClose()
  }

  const updateField = (path: string[], value: any) => {
    const newComponent = { ...editedComponent }
    let current = newComponent

    // Navigate to the nested property
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {}
      }
      current = current[path[i]]
    }

    // Set the value
    current[path[path.length - 1]] = value
    setEditedComponent(newComponent)
  }

  const getField = (path: string[]): any => {
    let current = editedComponent
    for (const key of path) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key]
      } else {
        return undefined
      }
    }
    return current
  }

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
          {/* Label */}
          {getField(['options', 'label']) !== undefined && (
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

          {/* Background Color */}
          {getField(['options', 'bgColor']) !== undefined && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">Background Color</label>
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

          {/* Border Color */}
          {getField(['options', 'borderColor']) !== undefined && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">Border Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={getField(['options', 'borderColor']) || '#000000'}
                  onChange={(e) => updateField(['options', 'borderColor'], e.target.value)}
                  className="w-16 h-10 rounded cursor-pointer bg-gray-800 border border-gray-700"
                />
                <input
                  type="text"
                  value={getField(['options', 'borderColor']) || ''}
                  onChange={(e) => updateField(['options', 'borderColor'], e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="#RRGGBB"
                />
              </div>
            </div>
          )}

          {/* Text Color */}
          {getField(['options', 'textColor']) !== undefined && (
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
              <label className="block text-sm font-semibold mb-2 text-gray-300">Position (Read-only)</label>
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
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-6 flex justify-end gap-3">
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
  )
}
