// App store for UI state
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { STORAGE_KEYS } from '~/shared/config/constants'
import type { PublicSettings } from '~/shared/types'

type Theme = 'light' | 'dark' | 'system'

export const useAppStore = defineStore('app', () => {
  // State
  const sidebarCollapsed = ref(localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true')
  const theme = ref<Theme>((localStorage.getItem(STORAGE_KEYS.THEME) as Theme) || 'system')
  const isLoading = ref(false)
  const locale = ref(localStorage.getItem(STORAGE_KEYS.LOCALE) || 'zh')

  // Public settings from backend
  const publicSettings = ref<PublicSettings | null>(null)
  const siteName = ref('Sub2API')
  const siteLogo = ref('')
  const siteVersion = ref('')

  // Getters
  const isDark = computed(() => {
    if (theme.value === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return theme.value === 'dark'
  })

  // Actions
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(sidebarCollapsed.value))
  }

  function setTheme(newTheme: Theme) {
    theme.value = newTheme
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme)
    applyTheme()
  }

  function applyTheme() {
    const isDarkMode = isDark.value
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function setLocale(newLocale: string) {
    locale.value = newLocale
    localStorage.setItem(STORAGE_KEYS.LOCALE, newLocale)
  }

  function setLoading(loading: boolean) {
    isLoading.value = loading
  }

  // Initialize settings from injected config (window.__APP_CONFIG__)
  function initFromInjectedConfig(): boolean {
    if (window.__APP_CONFIG__) {
      publicSettings.value = window.__APP_CONFIG__
      siteName.value = window.__APP_CONFIG__.site_name || 'Sub2API'
      siteLogo.value = window.__APP_CONFIG__.site_logo || ''
      siteVersion.value = window.__APP_CONFIG__.version || ''

      // Update document title
      if (siteName.value !== 'Sub2API') {
        document.title = `${siteName.value} - AI API Gateway`
      }

      // Apply theme from injected config if available
      if (publicSettings.value.landing_pricing_config) {
        // Config is loaded, can be used by components
        console.log('[App] Public settings loaded from injected config')
      }

      return true
    }
    return false
  }

  return {
    sidebarCollapsed,
    theme,
    isLoading,
    locale,
    isDark,
    publicSettings,
    siteName,
    siteLogo,
    siteVersion,
    toggleSidebar,
    setTheme,
    applyTheme,
    setLocale,
    setLoading,
    initFromInjectedConfig
  }
})
