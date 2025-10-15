import { LoupedeckPreview } from './components/LoupedeckPreview'
import { useConfig } from './hooks/useConfig'

function App() {
  const { data: config, isLoading: loading, error } = useConfig()

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
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🎛️ Loupedeck Configuration</h1>
          <p className="text-gray-400">View your current Loupedeck Live S settings</p>
        </header>

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
            <LoupedeckPreview components={config?.components} device={config?.device} />
          </div>
        </section>

        {/* Components Grid */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Component Layout</h2>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {config?.components &&
                Object.entries(config.components).map(([name, component]) => (
                  <div
                    key={name}
                    className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <h3 className="font-semibold mb-2 text-lg">
                      {component?.options?.label || name}
                    </h3>
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
    </div>
  )
}

export default App
