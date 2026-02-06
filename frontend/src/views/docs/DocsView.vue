<template>
  <div class="min-h-screen bg-gray-50 dark:bg-dark-950">
    <!-- Header -->
    <div class="border-b border-gray-200/60 bg-white/70 backdrop-blur dark:border-dark-800/60 dark:bg-dark-950/70">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <router-link to="/home" class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm dark:bg-dark-900"
          >
            <img :src="siteLogo || '/logo.png'" alt="Logo" class="h-full w-full object-contain" />
          </div>
          <div class="leading-tight">
            <div class="text-sm font-semibold text-gray-900 dark:text-white">{{ siteName }}</div>
            <div class="text-xs text-gray-500 dark:text-dark-400">Docs</div>
          </div>
        </router-link>

        <div class="flex items-center gap-2">
          <router-link
            v-if="isAuthenticated"
            :to="isAdmin ? '/admin/dashboard' : '/dashboard'"
            class="btn btn-secondary"
          >
            {{ t('nav.dashboard') }}
          </router-link>
          <router-link v-else to="/login" class="btn btn-primary">
            {{ t('auth.login') }}
          </router-link>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="mx-auto max-w-6xl px-4 py-8">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <!-- Sidebar -->
        <aside
          class="h-fit rounded-2xl border border-gray-200/60 bg-white p-4 shadow-sm dark:border-dark-800/60 dark:bg-dark-900"
        >
          <div class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-400">
            {{ t('docs.nav.title') }}
          </div>

          <nav class="space-y-1.5">
            <div v-if="navLoading" class="py-6">
              <LoadingSpinner />
            </div>
            <template v-else>
              <div v-for="group in groupedNavItems" :key="group.name" class="space-y-1.5">
                <div class="px-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-400">
                  {{ group.name }}
                </div>
                <router-link
                  v-for="item in group.items"
                  :key="item.key"
                  :to="`/docs/${item.key}`"
                  class="block rounded-xl px-3 py-2 text-sm transition-colors"
                  :class="
                    slug === item.key
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-dark-200 dark:hover:bg-dark-800'
                  "
                >
                  {{ item.title }}
                </router-link>
              </div>
            </template>
          </nav>

          <div class="my-4 h-px bg-gray-200/60 dark:bg-dark-800/60"></div>

          <a
            class="block rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-dark-200 dark:hover:bg-dark-800"
            href="https://github.com/Wei-Shaw/sub2api"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </aside>

        <!-- Main -->
        <main
          class="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm dark:border-dark-800/60 dark:bg-dark-900"
        >
          <div v-if="loading" class="flex items-center justify-center py-14">
            <LoadingSpinner />
          </div>
          <div
            v-else-if="errorMessage"
            class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
          >
            <div class="font-medium">{{ t('common.error') }}</div>
            <div class="mt-1">{{ errorMessage }}</div>
            <button class="btn btn-secondary mt-3" @click="reload">
              {{ t('common.refresh') }}
            </button>
          </div>
          <RichContentRenderer v-else :content="content" :format="format" />
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore, useAuthStore } from '@/stores'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import docsAPI from '@/api/docs'
import RichContentRenderer from '@/components/docs/RichContentRenderer.vue'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

const appStore = useAppStore()
const authStore = useAuthStore()

const siteName = computed(() => appStore.siteName || 'Sub2API')
const siteLogo = computed(() => appStore.siteLogo || '')
const isAuthenticated = computed(() => authStore.isAuthenticated)
const isAdmin = computed(() => authStore.isAdmin)

const slug = computed(() => String(route.params.slug || 'overview').toLowerCase())

const lang = computed<'zh' | 'en'>(() => (String(locale.value).toLowerCase().startsWith('zh') ? 'zh' : 'en'))

type DocsNavItem = {
  key: string
  title: string
  group?: string
  order?: number
  format?: string
}

const navLoading = ref(false)
const navItems = ref<DocsNavItem[]>([])

const groupedNavItems = computed(() => {
  const groups = new Map<string, { name: string; order: number; items: DocsNavItem[] }>()

  for (const item of navItems.value) {
    const name = String(item.group || '').trim() || t('docs.nav.title')
    const order = Number(item.order || 0)
    const existing = groups.get(name)
    if (!existing) {
      groups.set(name, { name, order, items: [item] })
    } else {
      existing.items.push(item)
      existing.order = Math.min(existing.order, order)
    }
  }

  const out = Array.from(groups.values()).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
  for (const g of out) {
    g.items.sort((a, b) => (Number(a.order || 0) - Number(b.order || 0)) || a.key.localeCompare(b.key))
  }

  return out
})

const loading = ref(false)
const errorMessage = ref('')
const content = ref('')
const format = ref('markdown')

async function loadNav(): Promise<void> {
  navLoading.value = true
  errorMessage.value = ''
  try {
    const items = await docsAPI.listDocsPages(lang.value)
    navItems.value = (items || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0))

    if (navItems.value.length > 0 && !navItems.value.some(i => i.key === slug.value)) {
      await router.replace(`/docs/${navItems.value[0].key}`)
    }
  } catch (error) {
    console.error('Failed to load docs navigation:', error)
    // Navigation failure shouldn't block reading if the page can still be fetched.
  } finally {
    navLoading.value = false
  }
}

async function loadPage(): Promise<void> {
  loading.value = true
  errorMessage.value = ''
  try {
    const page = await docsAPI.getDocsPage(slug.value, lang.value)
    content.value = page.markdown || ''
    format.value = page.format || 'markdown'
  } catch (error) {
    console.error('Failed to load docs:', error)
    errorMessage.value = t('docs.loadFailed')
  } finally {
    loading.value = false
  }
}

async function reload(): Promise<void> {
  await loadNav()
  await loadPage()
}

watch(lang, () => {
  loadNav()
  loadPage()
})

watch(slug, () => {
  loadPage()
})

onMounted(() => {
  loadNav()
  loadPage()
})
</script>
