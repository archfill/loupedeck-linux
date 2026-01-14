import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PageMeta } from '../types/config'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface PageMetaEditorProps {
  pageNum: number
  initialMeta: PageMeta
  onClose: () => void
  onSave: (pageNum: number, meta: PageMeta) => void
}

export function PageMetaEditor({ pageNum, initialMeta, onClose, onSave }: PageMetaEditorProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(initialMeta.title)
  const [description, setDescription] = useState(initialMeta.description)

  const handleSave = () => {
    onSave(pageNum, { title, description })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {t('preview.pageActions.editMeta')} - {t('preview.pageSelector')} {pageNum}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-semibold text-foreground">
              {t('preview.meta.title')}
            </Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('preview.meta.titlePlaceholder')}
              className="mt-2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-base font-semibold text-foreground">
              {t('preview.meta.description')}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('preview.meta.descriptionPlaceholder')}
              rows={3}
              className="mt-2 resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="button" variant="default" onClick={handleSave}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
