import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import './style.css'

const preloadReloadKey = 'vite_preload_reload_attempted'

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()

  const lastReload = sessionStorage.getItem(preloadReloadKey)
  const now = Date.now()

  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    sessionStorage.setItem(preloadReloadKey, now.toString())
    window.location.reload()
    return
  }

  console.error('Preload CSS/asset error persists after reload. Please clear browser cache.')
})

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// Initialize settings from injected config BEFORE mounting (prevents flash)
// This must happen after pinia is installed but before router and i18n
import { useAppStore } from '@/stores/app'
const appStore = useAppStore()
appStore.initFromInjectedConfig()

// Set document title immediately after config is loaded
if (appStore.siteName && appStore.siteName !== 'Sub2API') {
  document.title = `${appStore.siteName} - AI API Gateway`
}

app.use(router)
app.use(i18n)

// 等待路由器完成初始导航后再挂载，避免竞态条件导致的空白渲染
router.isReady().then(() => {
  app.mount('#app')
})
