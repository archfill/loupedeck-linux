import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '../i18n/config'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const currentLang = i18n.language as 'ja' | 'en'

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode)
  }

  return (
    <ToggleGroup
      type="single"
      value={currentLang}
      onValueChange={(value) => {
        if (value) handleLanguageChange(value)
      }}
      variant="outline"
      size="sm"
      aria-label="Language"
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <ToggleGroupItem key={lang.code} value={lang.code} title={lang.name}>
          <Languages className="mr-1 h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{lang.name}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
