import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Info, Trash2 } from 'lucide-react'
import type { ComponentConfig } from '../types/config'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

const IconPicker = lazy(async () => {
  const module = await import('./IconPicker')
  return { default: module.IconPicker }
})

interface ComponentEditorProps {
  component: ComponentConfig
  name: string
  pageNum: number
  onClose: () => void
  onSave: (updatedComponent: ComponentConfig) => void
  onDelete?: () => void
}

// NerdFont Icon Selector Component - Enhanced
interface NerdFontIconSelectorProps {
  currentIcon?: string
  onSelect: (icon: string | null) => void
}

function NerdFontIconSelector({ currentIcon, onSelect }: NerdFontIconSelectorProps) {
  const { t } = useTranslation()
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div className="flex gap-3 items-center">
      {/* Current Icon Display / Picker Button */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="w-16 h-16 nerd-font text-4xl"
        onClick={() => setShowPicker(true)}
        title={currentIcon || t('editor.icon.select')}
      >
        {currentIcon || '+'}
      </Button>

      {/* Icon Preview Text */}
      <div className="flex-1">
        <div className="text-sm text-muted-foreground">
          {currentIcon ? (
            <span className="text-foreground font-mono text-base">{currentIcon}</span>
          ) : (
            <span>{t('editor.icon.selectButton')}</span>
          )}
        </div>
      </div>

      {/* Clear Button */}
      {currentIcon && (
        <Button type="button" variant="destructive" onClick={() => onSelect(null)}>
          {t('common.clear')}
        </Button>
      )}

      {/* IconPicker Modal */}
      {showPicker && (
        <Suspense fallback={<div className="text-sm text-muted-foreground">{t('common.loading')}</div>}>
          <IconPicker
            currentIcon={currentIcon}
            onSelect={(icon) => {
              onSelect(icon)
              setShowPicker(false)
            }}
            onClose={() => setShowPicker(false)}
          />
        </Suspense>
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
  const { t } = useTranslation()
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{t('editor.title')}</DialogTitle>
          <p className="text-muted-foreground mt-2 font-mono text-sm">{name}</p>
        </DialogHeader>

        <Separator className="my-4" />

        {/* Form */}
        <div className="space-y-6">
          {/* Icon Section - 物理ボタン以外で表示 */}
          {!isPhysicalButton && (
            <div className="space-y-3">
              <Label className="text-base font-semibold text-foreground">
                {t('editor.icon.label')}
              </Label>

              {/* Icon Type Selector - Enhanced */}
              <Select
                value={getIconType}
                onValueChange={(newType) => {
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
              >
                <SelectTrigger className="w-full mb-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('editor.icon.types.none')}</SelectItem>
                  <SelectItem value="nerdfont">{t('editor.icon.types.nerdfont')}</SelectItem>
                  <SelectItem value="auto">{t('editor.icon.types.auto')}</SelectItem>
                  <SelectItem value="image">{t('editor.icon.types.image')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Conditional Fields */}
              {getIconType === 'nerdfont' && (
                <NerdFontIconSelector
                  currentIcon={getField(['options', 'icon'])}
                  onSelect={(icon) => updateField(['options', 'icon'], icon)}
                />
              )}

              {getIconType === 'auto' && (
                <div className="space-y-2 p-4 rounded-lg bg-muted">
                  <Label className="text-sm">
                    <Info className="mr-2 inline-block h-4 w-4" aria-hidden="true" />
                    {t('editor.icon.appNameHint')}
                  </Label>
                  <Input
                    type="text"
                    value={getField(['appName']) || ''}
                    onChange={(e) => updateField(['appName'], e.target.value)}
                    className="font-mono"
                    placeholder={t('editor.icon.placeholder')}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('editor.icon.appNameDescription')}
                    {getField(['appName']) && (
                      <span className="text-primary ml-2">
                        {t('editor.icon.current', { appName: getField(['appName']) })}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {getIconType === 'image' && (
                <Input
                  type="text"
                  value={getField(['options', 'iconImage']) || ''}
                  onChange={(e) => updateField(['options', 'iconImage'], e.target.value)}
                  className="font-mono"
                  placeholder="/path/to/icon.png"
                />
              )}
            </div>
          )}

          {/* Label - 物理ボタン以外で表示 */}
          {!isPhysicalButton && getField(['options', 'label']) !== undefined && (
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">{t('editor.label')}</Label>
              <Input
                type="text"
                value={getField(['options', 'label']) || ''}
                onChange={(e) => updateField(['options', 'label'], e.target.value)}
                className=""
              />
            </div>
          )}

          {/* Background Color - 物理ボタン以外で表示 */}
          {!isPhysicalButton && getField(['options', 'bgColor']) !== undefined && (
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">
                {t('editor.colors.background')}
              </Label>
              <div className="flex gap-3">
                <Input
                  type="color"
                  value={getField(['options', 'bgColor']) || '#000000'}
                  onChange={(e) => updateField(['options', 'bgColor'], e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={getField(['options', 'bgColor']) || ''}
                  onChange={(e) => updateField(['options', 'bgColor'], e.target.value)}
                  className="flex-1 font-mono"
                  placeholder="#RRGGBB"
                />
              </div>
            </div>
          )}

          {/* Text Color - 物理ボタン以外で表示 */}
          {!isPhysicalButton && getField(['options', 'textColor']) !== undefined && (
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">
                {t('editor.colors.text')}
              </Label>
              <div className="flex gap-3">
                <Input
                  type="color"
                  value={getField(['options', 'textColor']) || '#FFFFFF'}
                  onChange={(e) => updateField(['options', 'textColor'], e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={getField(['options', 'textColor']) || ''}
                  onChange={(e) => updateField(['options', 'textColor'], e.target.value)}
                  className="flex-1 font-mono"
                  placeholder="#RRGGBB"
                />
              </div>
            </div>
          )}

          {/* LED Color - Enhanced */}
          {getField(['options', 'ledColor']) !== undefined && (
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">
                {t('editor.colors.led')}
              </Label>
              <div className="flex gap-3">
                <Input
                  type="color"
                  value={getField(['options', 'ledColor']) || '#000000'}
                  onChange={(e) => updateField(['options', 'ledColor'], e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={getField(['options', 'ledColor']) || ''}
                  onChange={(e) => updateField(['options', 'ledColor'], e.target.value)}
                  className="flex-1 font-mono"
                  placeholder="#RRGGBB"
                />
              </div>
            </div>
          )}

          {/* Command */}
          {getField(['command']) !== undefined && (
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">
                {t('editor.command')}
              </Label>
              <Input
                type="text"
                value={getField(['command']) || ''}
                onChange={(e) => updateField(['command'], e.target.value)}
                className="font-mono"
                placeholder="command to execute"
              />
            </div>
          )}

          {/* Icon Size */}
          {getField(['options', 'iconSize']) !== undefined && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                {t('editor.iconSize', { size: getField(['options', 'iconSize']) })}
              </Label>
              <Input
                type="range"
                min="24"
                max="72"
                step="4"
                value={getField(['options', 'iconSize']) || 48}
                onChange={(e) => updateField(['options', 'iconSize'], Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          )}

          {/* Position (Read-only for now) */}
          {getField(['position']) && (
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">
                {t('editor.position.label')}
              </Label>
              <div className="flex gap-4">
                <div className="flex-1 rounded-md border bg-muted px-4 py-2 text-muted-foreground font-mono text-sm">
                  {t('editor.position.col')}: {getField(['position', 'col'])}
                </div>
                <div className="flex-1 rounded-md border bg-muted px-4 py-2 text-muted-foreground font-mono text-sm">
                  {t('editor.position.row')}: {getField(['position', 'row'])}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t('editor.position.comingSoon')}</p>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Footer */}
        <div className="flex justify-between items-center">
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                onDelete()
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" /> {t('editor.actions.delete')}
            </Button>
          )}
          <div className="flex gap-3 ml-auto">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="button" variant="default" onClick={handleSave}>
              {t('editor.actions.saveChanges')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
