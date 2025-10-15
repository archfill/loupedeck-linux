import { useState, useEffect } from 'react'
import { LoupedeckPreview } from './components/LoupedeckPreview'
import { ComponentEditor } from './components/ComponentEditor'
import { useConfig } from './hooks/useConfig'

function App() {
  const { data: config, isLoading: loading, error } = useConfig()
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState<{
    name: string
    component: any
    pageNum: number
  } | null>(null)
  const [editedConfig, setEditedConfig] = useState<any>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState<string>('')

  // Initialize editedConfig when config loads
  useEffect(() => {
    if (config && !editedConfig) {
      setEditedConfig(config)
    }
  }, [config, editedConfig])

  const handleComponentSave = (updatedComponent: any) => {
    if (!selectedComponent || !editedConfig) return

    // Create a deep copy of the config
    const newConfig = JSON.parse(JSON.stringify(editedConfig))

    // Update the component in the config
    if (newConfig.pages && newConfig.pages[selectedComponent.pageNum]) {
      const components = newConfig.pages[selectedComponent.pageNum]
      // Find and update the component (skip _meta)
      Object.keys(components).forEach((key) => {
        if (key !== '_meta' && key === selectedComponent.name) {
          components[key] = updatedComponent
        }
      })
    }

    setEditedConfig(newConfig)
    setSaveStatus('idle')
  }

  const handlePositionChange = (componentName: string, pageNum: number, newCol: number, newRow: number) => {
    if (!editedConfig) return

    // Create a deep copy of the config
    const newConfig = JSON.parse(JSON.stringify(editedConfig))

    // Update the component position
    if (newConfig.pages && newConfig.pages[pageNum]) {
      const components = newConfig.pages[pageNum]
      Object.keys(components).forEach((key) => {
        if (key !== '_meta' && key === componentName) {
          if (components[key].position) {
            components[key].position.col = newCol
            components[key].position.row = newRow
          }
        }
      })
    }

    setEditedConfig(newConfig)
  }

  const handleSwapComponents = (componentName1: string, componentName2: string, pageNum: number) => {
    if (!editedConfig) return

    console.log('Swapping in App.tsx:', componentName1, componentName2, pageNum)

    // Create a deep copy of the config
    const newConfig = JSON.parse(JSON.stringify(editedConfig))

    // Get the positions of both components
    const page = newConfig.pages?.[pageNum]
    if (!page) return

    const comp1 = page[componentName1]
    const comp2 = page[componentName2]

    if (!comp1 || !comp2 || !comp1.position || !comp2.position) return

    // Swap positions
    const tempPosition = { ...comp1.position }
    comp1.position.col = comp2.position.col
    comp1.position.row = comp2.position.row
    comp2.position.col = tempPosition.col
    comp2.position.row = tempPosition.row

    console.log('Swapped positions:', componentName1, comp1.position, componentName2, comp2.position)

    setEditedConfig(newConfig)
  }

  const handleDeleteComponent = (componentName: string, pageNum: number) => {
    if (!editedConfig || !confirm(`${componentName} を削除しますか？`)) return

    const newConfig = JSON.parse(JSON.stringify(editedConfig))

    if (newConfig.pages && newConfig.pages[pageNum]) {
      delete newConfig.pages[pageNum][componentName]
    }

    setEditedConfig(newConfig)
  }

  const handleAddComponent = (pageNum: number) => {
    if (!editedConfig) return

    const newConfig = JSON.parse(JSON.stringify(editedConfig))

    // 空いているグリッド位置を見つける
    const usedPositions = new Set<string>()
    if (newConfig.pages && newConfig.pages[pageNum]) {
      Object.entries(newConfig.pages[pageNum]).forEach(([key, comp]: [string, any]) => {
        if (key !== '_meta' && comp?.position) {
          usedPositions.add(`${comp.position.col},${comp.position.row}`)
        }
      })
    }

    // 空いている最初の位置を見つける
    let foundPosition = null
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        if (!usedPositions.has(`${col},${row}`)) {
          foundPosition = { col, row }
          break
        }
      }
      if (foundPosition) break
    }

    if (!foundPosition) {
      alert('グリッドが満杯です。空きスペースがありません。')
      return
    }

    // 新しいボタンを作成
    const newButtonName = `newButton${Date.now()}`
    const newButton = {
      type: 'button',
      position: foundPosition,
      appName: 'application',
      options: {
        label: 'New Button',
        iconSize: 48,
        bgColor: '#4A5568',
        borderColor: '#718096',
        textColor: '#FFFFFF',
        hoverBgColor: '#2D3748',
        vibrationPattern: 'tap',
      },
      command: 'echo "New button clicked"',
    }

    if (newConfig.pages && newConfig.pages[pageNum]) {
      newConfig.pages[pageNum][newButtonName] = newButton
    }

    setEditedConfig(newConfig)
  }

  const handleSaveAll = async () => {
    setSaveStatus('saving')
    try {
      const response = await fetch('http://localhost:9876/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedConfig.pages),
      })

      if (!response.ok) {
        throw new Error('Failed to save configuration')
      }

      setSaveStatus('success')
      setSaveMessage('Configuration saved! Please restart the backend to apply changes.')
      setTimeout(() => {
        setSaveStatus('idle')
        setSaveMessage('')
      }, 5000)
    } catch (err) {
      setSaveStatus('error')
      setSaveMessage(err instanceof Error ? err.message : 'Unknown error occurred')
      setTimeout(() => {
        setSaveStatus('idle')
        setSaveMessage('')
      }, 5000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading configuration...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center text-red-400">
          <p className="text-xl mb-2">❌ Error</p>
          <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
          <p className="mt-4 text-sm text-gray-400">
            Make sure the API server is running on port 9876
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">🎛️ Loupedeck Configuration</h1>
            <p className="text-gray-400">
              {isEditMode ? 'Edit your Loupedeck settings' : 'View your current Loupedeck Live S settings'}
            </p>
          </div>
          <div className="flex gap-3">
            {isEditMode && (
              <button
                onClick={handleSaveAll}
                disabled={saveStatus === 'saving'}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                {saveStatus === 'saving' ? (
                  <>
                    <span className="animate-spin">⏳</span> Saving...
                  </>
                ) : (
                  <>💾 Save All Changes</>
                )}
              </button>
            )}
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                isEditMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'
              }`}
            >
              {isEditMode ? '👁️ View Mode' : '✏️ Edit Mode'}
            </button>
          </div>
        </header>

        {/* Save Status Toast - Fixed position, no layout shift */}
        {saveMessage && (
          <div
            className={`fixed bottom-6 right-6 max-w-md p-4 rounded-lg border shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 ${
              saveStatus === 'success'
                ? 'bg-green-900/95 border-green-700 text-green-400'
                : 'bg-red-900/95 border-red-700 text-red-400'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">
                {saveStatus === 'success' ? '✓' : '✗'}
              </span>
              <div className="flex-1">
                <p className="font-semibold">
                  {saveStatus === 'success' ? 'Success' : 'Error'}
                </p>
                <p className="text-sm mt-1">{saveMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Device Info */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Device Information</h2>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Type</p>
                <p className="font-semibold">{config?.device?.type}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Grid</p>
                <p className="font-semibold">
                  {config?.device?.grid?.columns} × {config?.device?.grid?.rows}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Knobs</p>
                <p className="font-semibold">{config?.device?.knobs?.length}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Buttons</p>
                <p className="font-semibold">{config?.device?.buttons?.length}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Device Preview */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Device Preview</h2>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <LoupedeckPreview
              components={config?.components}
              pages={editedConfig?.pages || config?.pages}
              device={config?.device}
              isEditMode={isEditMode}
              onPositionChange={handlePositionChange}
              onSwapComponents={handleSwapComponents}
            />
          </div>
        </section>

        {/* Components Grid - All Pages */}
        {config?.pages && Object.entries(config.pages).map(([pageNum, pageData]) => {
          // 型ガード: PageDataかどうか確認
          if (!pageData || typeof pageData !== 'object') return null

          const pageMeta = pageData._meta
          const components = Object.entries(pageData).filter(([key]) => key !== '_meta')

          return (
            <section key={pageNum} className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-semibold">
                    Page {pageNum}: {pageMeta?.title || `Page ${pageNum}`}
                    {isEditMode && <span className="text-sm text-gray-400 ml-2">(クリックして編集)</span>}
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">{pageMeta?.description}</p>
                </div>
                {isEditMode && Number(pageNum) !== 2 && (
                  <button
                    onClick={() => handleAddComponent(Number(pageNum))}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    ➕ ボタン追加
                  </button>
                )}
              </div>
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {components.map(([name, component]: [string, any]) => {
                    // layoutコンポーネントはスキップ（動的生成）
                    if (component?.type === 'layout') {
                      return (
                        <div key={name} className="bg-gray-800 rounded-lg p-4 border border-gray-700 opacity-50">
                          <h3 className="font-semibold text-lg mb-2">{component?.options?.label || name}</h3>
                          <p className="text-sm text-gray-500">動的生成（編集不可）</p>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={name}
                        className={`bg-gray-800 rounded-lg p-4 border border-gray-700 transition-all relative ${
                          isEditMode
                            ? 'hover:border-blue-500 hover:bg-gray-750'
                            : 'hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3
                            className={`font-semibold text-lg flex-1 ${isEditMode ? 'cursor-pointer' : ''}`}
                            onClick={() => isEditMode && setSelectedComponent({ name, component, pageNum: Number(pageNum) })}
                          >
                            {component?.options?.label || name}
                          </h3>
                          {isEditMode && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSelectedComponent({ name, component, pageNum: Number(pageNum) })}
                                className="text-blue-400 hover:text-blue-300 text-sm px-2 py-1 rounded hover:bg-blue-900/20"
                                title="編集"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteComponent(name, Number(pageNum))
                                }}
                                className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded hover:bg-red-900/20"
                                title="削除"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="text-sm space-y-1">
                          <p className="text-gray-400">
                            Position:{' '}
                            <span className="text-white">
                              ({component?.position?.col}, {component?.position?.row})
                            </span>
                          </p>
                          {component?.options?.bgColor && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">Color:</span>
                              <div
                                className="w-6 h-6 rounded border border-gray-600"
                                style={{ backgroundColor: component.options.bgColor }}
                              ></div>
                              <span className="text-xs text-gray-500">
                                {component.options.bgColor}
                              </span>
                            </div>
                          )}
                          {component?.command && (
                            <p className="text-gray-400">
                              Command: <span className="text-white font-mono text-xs">{component.command}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          )
        })}

        {/* Constants */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">System Constants</h2>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config?.constants &&
                Object.entries(config.constants).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                    <span className="text-gray-400">{key}</span>
                    <span className="font-mono text-sm">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </section>
      </div>

      {/* Component Editor Modal */}
      {selectedComponent && (
        <ComponentEditor
          component={selectedComponent.component}
          name={selectedComponent.name}
          pageNum={selectedComponent.pageNum}
          onClose={() => setSelectedComponent(null)}
          onSave={handleComponentSave}
        />
      )}
    </div>
  )
}

export default App
