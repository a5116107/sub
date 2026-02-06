import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import router from './router'
import { i18n } from '~/shared/lib/i18n'
import { useAppStore } from '~/app/stores'
import '~/styles/index.css'

const app = createApp(App)
const pinia = createPinia()

// Install Pinia first (required for store access)
app.use(pinia)

// Initialize settings from injected config BEFORE mounting (prevents flash)
// This must happen after pinia is installed but before router and i18n
const appStore = useAppStore()
appStore.initFromInjectedConfig()

// Set document title immediately after config is loaded
if (appStore.siteName && appStore.siteName !== 'Sub2API') {
  document.title = `${appStore.siteName} - AI API Gateway`
}

// Other plugins
app.use(router)
app.use(i18n)
app.use(VueQueryPlugin)

// Wait for router to be ready before mounting
router.isReady().then(() => {
  app.mount('#app')
})
