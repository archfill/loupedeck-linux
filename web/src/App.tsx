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

        {/* Save Status Message */}
        {saveMessage && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              saveStatus === 'success'
                ? 'bg-green-900/20 border-green-700 text-green-400'
                : 'bg-red-900/20 border-red-700 text-red-400'
            }`}
          >
            <p className="font-semibold">
              {saveStatus === 'success' ? '✓ Success' : '✗ Error'}
            </p>
            <p className="text-sm mt-1">{saveMessage}</p>
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
              pages={config?.pages}
              device={config?.device}
            />
          </div>
        </section>

        {/* Components Grid */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Component Layout {isEditMode && <span className="text-sm text-gray-400 ml-2">(Click to edit)</span>}
          </h2>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {config?.components &&
                Object.entries(config.components).map(([name, component]) => (
                  <div
                    key={name}
                    onClick={() => isEditMode && setSelectedComponent({ name, component, pageNum: 1 })}
                    className={`bg-gray-800 rounded-lg p-4 border border-gray-700 transition-all ${
                      isEditMode
                        ? 'hover:border-blue-500 hover:bg-gray-750 cursor-pointer hover:scale-105'
                        : 'hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg">
                        {component?.options?.label || name}
                      </h3>
                      {isEditMode && (
                        <span className="text-blue-400 text-sm">✏️</span>
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
                ))}
            </div>
          </div>
        </section>

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
