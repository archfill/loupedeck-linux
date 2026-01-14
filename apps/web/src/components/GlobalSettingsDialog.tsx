import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import type { Config, PagesConfig } from '../types/config'

interface GlobalSettingsDialogProps {
  config: Config | null
  onSave: (pages: PagesConfig) => void
}

export function GlobalSettingsDialog({ config, onSave }: GlobalSettingsDialogProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const isNotificationsEnabled = !!config?.pages?.['1']?.['notificationDisplay']

  const handleToggleNotifications = (checked: boolean) => {
    if (!config || !config.pages) return

    const newPages = JSON.parse(JSON.stringify(config.pages))
    const page1 = newPages['1']

    if (!page1) return

    if (checked) {
      page1['notificationDisplay'] = {
        type: 'notificationDisplay',
        position: { col: 4, row: 0 },
        options: {
          cellBgColor: '#1a1a2e',
          cellBorderColor: '#6a4a8a',
          appNameColor: '#AA88FF',
          titleColor: '#FFFFFF',
          bodyColor: '#CCCCCC',
        },
      }
    } else {
      delete page1['notificationDisplay']
    }

    onSave(newPages)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title={t('settings.title')}>
          <Settings className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t('settings.title')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
          <DialogDescription>{t('settings.description')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="notifications" className="flex flex-col space-y-1">
              <span>{t('settings.notifications.label')}</span>
              <span className="font-normal text-xs text-muted-foreground">
                {t('settings.notifications.description')}
              </span>
            </Label>
            <Switch
              id="notifications"
              checked={isNotificationsEnabled}
              onCheckedChange={handleToggleNotifications}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
