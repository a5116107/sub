<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDocsNavQuery, useDocsPageQuery } from '~/entities/docs'
import { Card, Skeleton } from '~/shared/ui'
import { EmptyState } from '~/widgets'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

// State
const selectedKey = ref<string>((route.params.key as string) || '')
const docsLang = computed(() => String(locale.value || 'zh'))

// Queries
const navParams = computed(() => ({ lang: docsLang.value }))
const { data: navItems, isLoading: navLoading } = useDocsNavQuery(navParams)

const { data: pageData, isLoading: pageLoading, error: pageError } = useDocsPageQuery(
  selectedKey,
  docsLang
)

const pageBody = computed(() => pageData.value?.markdown || '')

// Watch route changes
watch(
  () => route.params.key,
  (newKey) => {
    selectedKey.value = (newKey as string) || ''
  }
)

// Auto-select first item if none selected
watch(
  navItems,
  (items) => {
    if (items && items.length > 0 && !selectedKey.value) {
      selectPage(items[0].key)
    }
  },
  { immediate: true }
)

// Methods
function selectPage(key: string) {
  selectedKey.value = key
  router.push({ name: 'Docs', params: { key } })
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <div class="flex flex-col lg:flex-row gap-6">
      <!-- Sidebar Navigation -->
      <aside class="lg:w-64 flex-shrink-0">
        <Card class="p-4 sticky top-6">
          <h2 class="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            {{ t('docs.navigation', 'Documentation') }}
          </h2>

          <!-- Loading state -->
          <div v-if="navLoading" class="space-y-2">
            <Skeleton v-for="i in 5" :key="i" class="h-8 w-full" />
          </div>

          <!-- Empty state -->
          <p v-else-if="!navItems || navItems.length === 0" class="text-sm text-[var(--text-tertiary)]">
            {{ t('docs.noPages', 'No documentation available') }}
          </p>

          <!-- Navigation items -->
          <nav v-else class="space-y-1">
            <button
              v-for="item in navItems"
              :key="item.key"
              class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
              :class="[
                selectedKey === item.key
                  ? 'bg-[var(--color-primary-100)] dark:bg-[var(--color-primary-900)]/30 text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)] font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
              ]"
              @click="selectPage(item.key)"
            >
              {{ item.title }}
            </button>
          </nav>
        </Card>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 min-w-0">
        <!-- Loading state -->
        <Card v-if="pageLoading" class="p-6">
          <Skeleton class="h-8 w-1/3 mb-4" />
          <Skeleton class="h-4 w-full mb-2" />
          <Skeleton class="h-4 w-full mb-2" />
          <Skeleton class="h-4 w-2/3 mb-6" />
          <Skeleton class="h-4 w-full mb-2" />
          <Skeleton class="h-4 w-full mb-2" />
          <Skeleton class="h-4 w-3/4" />
        </Card>

        <!-- Error state -->
        <EmptyState
          v-else-if="pageError"
          :title="t('docs.error.title', 'Failed to load page')"
          :description="t('docs.error.description', 'Unable to load the documentation page. Please try again.')"
          icon="⚠️"
        />

        <!-- Empty state -->
        <EmptyState
          v-else-if="!pageData && !selectedKey"
          :title="t('docs.empty.title', 'Select a page')"
          :description="t('docs.empty.description', 'Choose a documentation page from the sidebar to get started.')"
          icon="📖"
        />

        <!-- Page content -->
        <Card v-else-if="pageData" class="p-6">
          <!-- Page header -->
          <div class="mb-6 pb-4 border-b border-[var(--border-primary)]">
            <h1 class="text-2xl font-bold text-[var(--text-primary)]">
              {{ pageData.title }}
            </h1>
            <p v-if="pageData.updated_at" class="text-sm text-[var(--text-tertiary)] mt-1">
              {{ t('docs.lastUpdated', 'Last updated') }}: {{ formatDate(pageData.updated_at) }}
            </p>
          </div>

          <!-- Docs content (backend baseline: markdown field) -->
          <div
            class="whitespace-pre-wrap break-words text-[var(--text-secondary)] leading-7"
            v-text="pageBody"
          />
        </Card>
      </main>
    </div>
  </div>
</template>
