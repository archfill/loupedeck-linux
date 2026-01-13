import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PageMeta } from '../types/config'

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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-2xl font-bold mb-4 text-white">
          {t('preview.pageActions.editMeta')} - {t('preview.pageSelector')} {pageNum}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {t('preview.meta.title')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-white placeholder-gray-500"
              placeholder={t('preview.meta.titlePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {t('preview.meta.description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-white resize-none placeholder-gray-500"
              rows={3}
              placeholder={t('preview.meta.descriptionPlaceholder')}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            {t('common.save')}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
