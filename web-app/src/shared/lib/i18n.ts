// i18n configuration
import { createI18n } from 'vue-i18n'
import { STORAGE_KEYS } from '~/shared/config/constants'

// Import locale messages
import en from './locales/en'
import zh from './locales/zh'

const messages = {
  en,
  zh
}

// Get saved locale or detect from browser
function getInitialLocale(): string {
  const saved = localStorage.getItem(STORAGE_KEYS.LOCALE)
  if (saved && ['en', 'zh'].includes(saved)) {
    return saved
  }

  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('zh')) {
    return 'zh'
  }
  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: 'en',
  messages,
  globalInjection: true
})

// Helper to change locale
export function setLocale(locale: 'en' | 'zh') {
  i18n.global.locale.value = locale
  localStorage.setItem(STORAGE_KEYS.LOCALE, locale)
  document.querySelector('html')?.setAttribute('lang', locale)
}

export default i18n
