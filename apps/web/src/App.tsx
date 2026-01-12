import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LoupedeckPreview } from './components/LoupedeckPreview'
import { ComponentEditor } from './components/ComponentEditor'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { useConfig } from './hooks/useConfig'
import { useConfigSync } from './hooks/useConfigSync'
import type { ComponentConfig } from './types/config'

function App() {
  const { t } = useTranslation()
  const { data: config, isLoading: loading, error } = useConfig()

  // 型ガード関数
  const isComponentConfig = (value: unknown): value is ComponentConfig => {
    return typeof value === 'object' && value !== null && 'type' in value
  }
  const [selectedComponent, setSelectedComponent] = useState<{
    name: string
    component: ComponentConfig
    pageNum: number
  } | null>(null)
  const {
    editedConfig,
    setEditedConfig,
    saveStatus,
    saveMessage,
    queueImmediateSave,
    queueDebouncedSave,
  } = useConfigSync({ config })

  const handleComponentSave = (updatedComponent: ComponentConfig) => {
    if (!selectedComponent || !editedConfig) return

    // Create a deep copy of the config
    const newConfig = JSON.parse(JSON.stringify(editedConfig))
    const pageKey = String(selectedComponent.pageNum)

    // Update the component in the config
    if (newConfig.pages && newConfig.pages[pageKey]) {
      const components = newConfig.pages[pageKey]
      // Find and update the component (skip _meta)
      Object.keys(components).forEach((key) => {
        if (key !== '_meta' && key === selectedComponent.name) {
          components[key] = updatedComponent
        }
      })
    }

    setEditedConfig(newConfig)
    setSelectedComponent((prev) => (prev ? { ...prev, component: updatedComponent } : prev))
    queueDebouncedSave(newConfig.pages)
  }

  const handlePositionChange = (
    componentName: string,
    pageNum: number,
    newCol: number,
    newRow: number
  ) => {
    if (!editedConfig) return

    // Create a deep copy of the config
    const newConfig = JSON.parse(JSON.stringify(editedConfig))
    const pageKey = String(pageNum)

    // Update the component position
    if (newConfig.pages && newConfig.pages[pageKey]) {
      const components = newConfig.pages[pageKey]
      Object.keys(components).forEach((key) => {
        if (key !== '_meta' && key === componentName) {
          const component = components[key] as ComponentConfig | undefined
          if (component?.position) {
            component.position.col = newCol
            component.position.row = newRow
          }
        }
      })
    }

    setEditedConfig(newConfig)
    queueImmediateSave(newConfig.pages)
  }

  const handleSwapComponents = (
    componentName1: string,
    componentName2: string,
    pageNum: number
  ) => {
    if (!editedConfig) return

    console.log('Swapping in App.tsx:', componentName1, componentName2, pageNum)

    // Create a deep copy of the config
    const newConfig = JSON.parse(JSON.stringify(editedConfig))
    const pageKey = String(pageNum)

    // Get the positions of both components
    const page = newConfig.pages?.[pageKey]
    if (!page) return

    const comp1 = page[componentName1] as ComponentConfig | undefined
    const comp2 = page[componentName2] as ComponentConfig | undefined

    if (!comp1 || !comp2 || !comp1.position || !comp2.position) return

    // Swap positions
    const tempPosition = { ...comp1.position }
    comp1.position.col = comp2.position.col
    comp1.position.row = comp2.position.row
    comp2.position.col = tempPosition.col
    comp2.position.row = tempPosition.row

    console.log(
      'Swapped positions:',
      componentName1,
      comp1.position,
      componentName2,
      comp2.position
    )

    setEditedConfig(newConfig)
    queueImmediateSave(newConfig.pages)
  }

  const handleDeleteComponent = (componentName: string, pageNum: number) => {
    if (!editedConfig || !confirm(t('app.alerts.deleteConfirm', { name: componentName }))) return

    const newConfig = JSON.parse(JSON.stringify(editedConfig))
    const pageKey = String(pageNum)

    if (newConfig.pages && newConfig.pages[pageKey]) {
      delete newConfig.pages[pageKey][componentName]
    }

    setEditedConfig(newConfig)
    queueImmediateSave(newConfig.pages)
  }

  const handleAddComponent = (pageNum: number) => {
    if (!editedConfig) return

    const newConfig = JSON.parse(JSON.stringify(editedConfig))
    const pageKey = String(pageNum)

    // 空いているグリッド位置を見つける
    const usedPositions = new Set<string>()
    if (newConfig.pages && newConfig.pages[pageKey]) {
      Object.entries(newConfig.pages[pageKey]).forEach(([key, comp]) => {
        if (key !== '_meta' && comp && isComponentConfig(comp) && comp.position) {
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
      alert(t('app.alerts.gridFull'))
      return
    }

    // 新しいボタンを作成
    const newButtonName = `newButton${Date.now()}`
    const newButton = {
      type: 'button',
      position: foundPosition,
      appName: '', // 空にしておく（commandから自動設定される）
      options: {
        label: 'New Button',
        iconType: 'none', // デフォルトはなし
        iconSize: 48,
        bgColor: '#4A5568',
        borderColor: '#718096',
        textColor: '#FFFFFF',
        hoverBgColor: '#2D3748',
        vibrationPattern: 'tap',
      },
      command: '', // 空にしておく（ユーザーが入力）
    }

    if (newConfig.pages && newConfig.pages[pageKey]) {
      newConfig.pages[pageKey][newButtonName] = newButton
    }

    setEditedConfig(newConfig)
    queueImmediateSave(newConfig.pages)
  }

  // handleSaveAllは削除（リアルタイム自動保存に移行）

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center text-red-400">
          <p className="text-xl mb-2">❌ {t('common.error')}</p>
          <p>{error instanceof Error ? error.message : t('common.error')}</p>
          <p className="mt-4 text-sm text-gray-400">{t('app.alerts.apiError')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">🎛️ {t('app.title')}</h1>
            <p className="text-gray-400">{t('app.subtitle')}</p>
          </div>
          <div className="flex gap-3 items-center">
            <LanguageSwitcher />
            {saveStatus !== 'idle' && (
              <div className="flex items-center gap-2 text-sm">
                {saveStatus === 'saving' && (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span className="text-yellow-400">{t('app.saveStatus.saving')}</span>
                  </>
                )}
                {saveStatus === 'success' && (
                  <>
                    <span>✓</span>
                    <span className="text-green-400">{t('app.saveStatus.saved')}</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <span>✗</span>
                    <span className="text-red-400">{t('app.saveStatus.error')}</span>
                  </>
                )}
              </div>
            )}
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
              <span className="text-2xl">{saveStatus === 'success' ? '✓' : '✗'}</span>
              <div className="flex-1">
                <p className="font-semibold">
                  {saveStatus === 'success' ? t('common.success') : t('common.error')}
                </p>
                <p className="text-sm mt-1">{saveMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Device Info */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{t('app.deviceInfo.title')}</h2>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-400 text-sm">{t('app.deviceInfo.type')}</p>
                <p className="font-semibold">{config?.device?.type}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">{t('app.deviceInfo.grid')}</p>
                <p className="font-semibold">
                  {config?.device?.grid?.columns} × {config?.device?.grid?.rows}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">{t('app.deviceInfo.knobs')}</p>
                <p className="font-semibold">{config?.device?.knobs?.length}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">{t('app.deviceInfo.buttons')}</p>
                <p className="font-semibold">{config?.device?.buttons?.length}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Device Preview */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">{t('app.devicePreview.title')}</h2>
            <button
              onClick={() => handleAddComponent(1)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              ➕ {t('app.devicePreview.addButton')}
            </button>
          </div>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <LoupedeckPreview
              components={config?.components}
              pages={editedConfig?.pages || config?.pages}
              device={config?.device}
              onPositionChange={handlePositionChange}
              onSwapComponents={handleSwapComponents}
              onEditComponent={(componentName, pageNum) => {
                const pageKey = String(pageNum)
                const page = (editedConfig?.pages || config?.pages)?.[pageKey]
                if (!page) return

                const component = page[componentName] as ComponentConfig
                if (component) {
                  setSelectedComponent({
                    name: componentName,
                    component,
                    pageNum,
                  })
                }
              }}
            />
          </div>
        </section>

        {/* Constants */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">{t('app.systemConstants.title')}</h2>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config?.constants &&
                Object.entries(config.constants).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0"
                  >
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
          onDelete={() => {
            handleDeleteComponent(selectedComponent.name, selectedComponent.pageNum)
            setSelectedComponent(null)
          }}
        />
      )}
    </div>
  )
}

export default App
