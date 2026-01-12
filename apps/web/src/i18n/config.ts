const STORAGE_KEY = 'loupedeck-language'

/**
 * 初期言語を取得
 * 1. localStorageの保存値
 * 2. ブラウザの言語設定
 * 3. デフォルト（'en'）
 */
export function getInitialLanguage(): string {
  // localStorageから取得
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && (saved === 'ja' || saved === 'en')) {
    return saved
  }

  // ブラウザ言語から判定
  const browserLang = navigator.language.split('-')[0]
  if (browserLang === 'ja') {
    return 'ja'
  }

  // デフォルトは英語
  return 'en'
}

/**
 * 言語設定を永続化
 */
export function saveLanguage(lang: string): void {
  localStorage.setItem(STORAGE_KEY, lang)
}

/**
 * 対応言語リスト
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code']
