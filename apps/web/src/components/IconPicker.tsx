import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import nerdFontIcons from '../data/nerdFontIcons.json'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'

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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-2xl font-bold">{t('iconPicker.title')}</DialogTitle>
            <div className="flex gap-2">
              {currentIcon && (
                <Button type="button" variant="destructive" onClick={handleClear}>
                  {t('common.clear')}
                </Button>
              )}
              <Button type="button" variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search Box */}
          <div className="mt-4">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('iconPicker.searchPlaceholder')}
              autoFocus
            />
          </div>
        </DialogHeader>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto h-auto">
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} className="whitespace-nowrap">
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeCategory} className="mt-4">
            {/* Icon Grid */}
            <ScrollArea className="h-[500px]">
              {filteredIcons.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  {t('iconPicker.noResults')}
                </div>
              ) : (
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 pr-4">
                  {filteredIcons.map((icon) => (
                    <Button
                      key={icon.char}
                      type="button"
                      variant="outline"
                      size="icon"
                      className={`aspect-square nerd-font text-3xl ${
                        currentIcon === icon.char ? 'border-primary ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleIconClick(icon.char)}
                      title={t('iconPicker.tooltip', {
                        name: icon.name,
                        keywords: icon.keywords.join(', '),
                      })}
                    >
                      {icon.char}
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="border-t pt-4 text-center text-sm text-muted-foreground">
          {t('iconPicker.iconCount', { count: filteredIcons.length })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
