import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import jaTranslation from './locales/ja/translation.json'
import enTranslation from './locales/en/translation.json'
import { getInitialLanguage, saveLanguage } from './config'

const resources = {
  ja: { translation: jaTranslation },
  en: { translation: enTranslation },
}

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
})

// 言語変更時に永続化
i18n.on('languageChanged', (lng) => {
  saveLanguage(lng)
  // HTML lang属性を更新
  document.documentElement.lang = lng
})

export default i18n
