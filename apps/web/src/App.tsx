import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Check, Loader2, Plus, Sliders, XCircle } from 'lucide-react'
import { LoupedeckPreview } from './components/LoupedeckPreview'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { ThemeToggle } from './components/theme-toggle'
import { useConfig } from './hooks/useConfig'
import { useConfigSync } from './hooks/useConfigSync'
import { usePageApi } from './hooks/usePageApi'
import type { ComponentConfig, PageMeta } from './types/config'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

import { GlobalSettingsDialog } from './components/GlobalSettingsDialog'

const ComponentEditor = lazy(async () => {
  const module = await import('./components/ComponentEditor')
  return { default: module.ComponentEditor }
})

const PageMetaEditor = lazy(async () => {
  const module = await import('./components/PageMetaEditor')
  return { default: module.PageMetaEditor }
})

const DialogFallback = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
)

function App() {
  const { t } = useTranslation()
  const { data: config, isLoading: loading, error } = useConfig()
  const { createPage, deletePage, updatePageMeta } = usePageApi()

  // 型ガード関数
  const isComponentConfig = (value: unknown): value is ComponentConfig => {
    return typeof value === 'object' && value !== null && 'type' in value
  }
  const [selectedComponent, setSelectedComponent] = useState<{
    name: string
    component: ComponentConfig
    pageNum: number
  } | null>(null)
  const [pageMetaEditorState, setPageMetaEditorState] = useState<{
    pageNum: number
    meta: PageMeta
  } | null>(null)
  const [pendingDeleteComponent, setPendingDeleteComponent] = useState<{
    name: string
    pageNum: number
  } | null>(null)
  const [alertDialog, setAlertDialog] = useState<{
    title: string
    description?: string
  } | null>(null)
  const {
    editedConfig,
    setEditedConfig,
    saveStatus,
    saveMessage,
    queueImmediateSave,
    queueDebouncedSave,
  } = useConfigSync({ config })

  const handleGlobalSettingsSave = (pages: any) => {
    if (!editedConfig) return
    const newConfig = { ...editedConfig, pages }
    setEditedConfig(newConfig)
    queueImmediateSave(pages)
  }

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

  const showAlert = (message: string) => {
    setAlertDialog({ title: t('common.error'), description: message })
  }

  const removeComponent = (componentName: string, pageNum: number) => {
    if (!editedConfig) return

    const newConfig = JSON.parse(JSON.stringify(editedConfig))
    const pageKey = String(pageNum)

    if (newConfig.pages && newConfig.pages[pageKey]) {
      delete newConfig.pages[pageKey][componentName]
    }

    setEditedConfig(newConfig)
    queueImmediateSave(newConfig.pages)
  }

  const requestDeleteComponent = (componentName: string, pageNum: number) => {
    setPendingDeleteComponent({ name: componentName, pageNum })
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
      showAlert(t('app.alerts.gridFull'))
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

  // ページ操作ハンドラー
  const handleAddPage = async () => {
    try {
      const pageNum = await createPage(t('preview.meta.defaultTitle'), '')
      console.log('Page added:', pageNum)
      // 設定を再読み込み
      window.location.reload()
    } catch (err) {
      console.error('Failed to add page:', err)
      showAlert(err instanceof Error ? err.message : t('common.error'))
    }
  }

  const handleDeletePage = async (pageNum: number) => {
    try {
      await deletePage(String(pageNum))
      // 設定を再読み込み
      window.location.reload()
    } catch (err) {
      console.error('Failed to delete page:', err)
      showAlert(err instanceof Error ? err.message : t('common.error'))
    }
  }

  const handleEditPageMeta = (pageNum: number) => {
    const pageKey = String(pageNum)
    const page = editedConfig?.pages?.[pageKey] || config?.pages?.[pageKey]
    if (!page || !page._meta) return

    setPageMetaEditorState({
      pageNum,
      meta: page._meta,
    })
  }

  const handleSavePageMeta = async (pageNum: number, meta: PageMeta) => {
    try {
      await updatePageMeta(String(pageNum), meta)
      // 設定を再読み込み
      window.location.reload()
    } catch (err) {
      console.error('Failed to update page meta:', err)
      showAlert(err instanceof Error ? err.message : t('common.error'))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="loading-dots justify-center mb-6">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p className="text-muted-foreground font-medium">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center text-destructive">
          <p className="text-2xl mb-3 flex items-center justify-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
            {t('common.error')}
          </p>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : t('common.error')}
          </p>
          <p className="text-sm text-muted-foreground">{t('app.alerts.apiError')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8 lg:px-8">
        {/* Header */}
        <header className="mb-12">
          <div className="bg-card border border-border rounded-lg px-6 py-5 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold mb-2 text-foreground">
                  <Sliders className="mr-2 inline-block h-8 w-8 text-primary" aria-hidden="true" />
                  {t('app.title')}
                </h1>
                <p className="text-muted-foreground text-sm lg:text-base">{t('app.subtitle')}</p>
              </div>
              <div className="flex gap-2 items-center">
                <GlobalSettingsDialog
                  config={editedConfig || config || null}
                  onSave={handleGlobalSettingsSave}
                />
                <ThemeToggle />
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </header>

        {/* Save Status Toast */}
        {saveStatus !== 'idle' && (
          <div className="fixed bottom-6 right-6 max-w-md z-50">
            <div
              className={`p-4 rounded-lg border shadow ${
                saveStatus === 'saving'
                  ? 'bg-muted text-foreground'
                  : saveStatus === 'success'
                    ? 'bg-muted text-foreground'
                    : 'bg-destructive text-destructive-foreground'
              }`}
            >
              <div className="flex items-start gap-3">
                {saveStatus === 'saving' ? (
                  <Loader2 className="h-6 w-6 mt-0.5 animate-spin" />
                ) : saveStatus === 'success' ? (
                  <Check className="h-6 w-6 mt-0.5" />
                ) : (
                  <XCircle className="h-6 w-6 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-sm">
                    {saveStatus === 'saving'
                      ? t('app.saveStatus.saving')
                      : saveStatus === 'success'
                        ? t('common.success')
                        : t('common.error')}
                  </p>
                  {saveMessage && <p className="text-sm mt-1 opacity-90">{saveMessage}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Device Info */}
        <section className="mb-8">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-5">{t('app.deviceInfo.title')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {t('app.deviceInfo.type')}
                  </p>
                  <p className="font-mono text-lg font-medium">{config?.device?.type}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {t('app.deviceInfo.grid')}
                  </p>
                  <p className="font-mono text-lg font-medium">
                    {config?.device?.grid?.columns} × {config?.device?.grid?.rows}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {t('app.deviceInfo.knobs')}
                  </p>
                  <p className="font-mono text-lg font-medium">{config?.device?.knobs?.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {t('app.deviceInfo.buttons')}
                  </p>
                  <p className="font-mono text-lg font-medium">{config?.device?.buttons?.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Device Preview */}
        <section className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
            <div>
              <h2 className="text-2xl font-bold">{t('app.devicePreview.title')}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Drag & drop to reorganize • Click to edit
              </p>
            </div>
            <Button onClick={() => handleAddComponent(1)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('app.devicePreview.addButton')}
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
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
                onAddPage={handleAddPage}
                onDeletePage={handleDeletePage}
                onEditPageMeta={handleEditPageMeta}
              />
            </CardContent>
          </Card>
        </section>

        {/* System Constants */}
        <section>
          <h2 className="text-2xl font-bold mb-5">{t('app.systemConstants.title')}</h2>
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config?.constants &&
                  Object.entries(config.constants).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between items-center py-3 px-4 rounded-lg bg-muted border"
                    >
                      <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        {key}
                      </span>
                      <span className="font-mono text-sm text-foreground">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Component Editor Modal */}
      {selectedComponent && (
        <Suspense fallback={<DialogFallback />}>
          <ComponentEditor
            component={selectedComponent.component}
            name={selectedComponent.name}
            pageNum={selectedComponent.pageNum}
            onClose={() => setSelectedComponent(null)}
            onSave={handleComponentSave}
            onDelete={() => {
              requestDeleteComponent(selectedComponent.name, selectedComponent.pageNum)
              setSelectedComponent(null)
            }}
          />
        </Suspense>
      )}

      {/* Page Meta Editor Modal */}
      {pageMetaEditorState && (
        <Suspense fallback={<DialogFallback />}>
          <PageMetaEditor
            pageNum={pageMetaEditorState.pageNum}
            initialMeta={pageMetaEditorState.meta}
            onClose={() => setPageMetaEditorState(null)}
            onSave={handleSavePageMeta}
          />
        </Suspense>
      )}

      <AlertDialog
        open={!!pendingDeleteComponent}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteComponent(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteComponent
                ? t('app.alerts.deleteConfirm', { name: pendingDeleteComponent.name })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteComponent) {
                  removeComponent(pendingDeleteComponent.name, pendingDeleteComponent.pageNum)
                }
                setPendingDeleteComponent(null)
              }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!alertDialog}
        onOpenChange={(open) => {
          if (!open) {
            setAlertDialog(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialog?.title}</AlertDialogTitle>
            {alertDialog?.description ? (
              <AlertDialogDescription>{alertDialog.description}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertDialog(null)}>
              {t('common.close')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default App
