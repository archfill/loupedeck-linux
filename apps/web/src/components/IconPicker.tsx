import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import nerdFontIcons from '../data/nerdFontIcons.json'

interface IconPickerProps {
  onSelect: (icon: string | null) => void
  currentIcon?: string
  onClose: () => void
}

interface NerdFontIcon {
  char: string
  name: string
  keywords: string[]
}

interface CategoryData {
  name: string
  icons: NerdFontIcon[]
}

export function IconPicker({ onSelect, currentIcon, onClose }: IconPickerProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')

  // カテゴリーリストの作成
  const categories = useMemo(() => {
    const cats = [{ id: 'all', name: t('iconPicker.categories.all') }]
    Object.entries(nerdFontIcons.categories).forEach(([key, value]: [string, CategoryData]) => {
      cats.push({ id: key, name: value.name })
    })
    return cats
  }, [])

  // 検索とカテゴリフィルタリング
  const filteredIcons = useMemo(() => {
    let icons: NerdFontIcon[] = []

    // カテゴリでフィルタ
    if (activeCategory === 'all') {
      Object.values(nerdFontIcons.categories).forEach((cat: CategoryData) => {
        icons = [...icons, ...cat.icons]
      })
    } else {
      const catData =
        nerdFontIcons.categories[activeCategory as keyof typeof nerdFontIcons.categories]
      if (catData) {
        icons = catData.icons
      }
    }

    // 検索クエリでフィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      icons = icons.filter((icon) => {
        return (
          icon.name.toLowerCase().includes(query) ||
          icon.keywords.some((kw) => kw.toLowerCase().includes(query))
        )
      })
    }

    return icons
  }, [activeCategory, searchQuery])

  const handleIconClick = (icon: string) => {
    onSelect(icon)
    onClose()
  }

  const handleClear = () => {
    onSelect(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{t('iconPicker.title')}</h2>
            <div className="flex gap-2">
              {currentIcon && (
                <button
                  onClick={handleClear}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  {t('common.clear')}
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('iconPicker.searchPlaceholder')}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Icon Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredIcons.length === 0 ? (
            <div className="text-center text-gray-500 py-12">{t('iconPicker.noResults')}</div>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
              {filteredIcons.map((icon) => (
                <button
                  key={icon.char}
                  onClick={() => handleIconClick(icon.char)}
                  className={`aspect-square bg-gray-800 border-2 rounded-lg flex items-center justify-center text-3xl hover:border-blue-500 hover:bg-gray-750 transition-all nerd-font ${
                    currentIcon === icon.char
                      ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50'
                      : 'border-gray-700'
                  }`}
                  title={t('iconPicker.tooltip', {
                    name: icon.name,
                    keywords: icon.keywords.join(', '),
                  })}
                >
                  {icon.char}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-4 text-center text-sm text-gray-500">
          {t('iconPicker.iconCount', { count: filteredIcons.length })}
        </div>
      </div>
    </div>
  )
}
