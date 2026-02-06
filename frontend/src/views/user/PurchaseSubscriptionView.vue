<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="page-header">
        <h1 class="page-title">{{ t('purchaseSubscription.title') }}</h1>
        <p class="page-description">{{ t('purchaseSubscription.description') }}</p>
      </div>

      <div
        v-if="!purchaseSubscriptionEnabled"
        class="card p-6"
      >
        <div class="text-sm font-medium text-gray-900 dark:text-white">
          {{ t('purchaseSubscription.notEnabledTitle') }}
        </div>
        <div class="mt-1 text-sm text-gray-600 dark:text-dark-400">
          {{ t('purchaseSubscription.notEnabledDesc') }}
        </div>
      </div>

      <div
        v-else-if="!purchaseSubscriptionUrl"
        class="card p-6"
      >
        <div class="text-sm font-medium text-gray-900 dark:text-white">
          {{ t('purchaseSubscription.notConfiguredTitle') }}
        </div>
        <div class="mt-1 text-sm text-gray-600 dark:text-dark-400">
          {{ t('purchaseSubscription.notConfiguredDesc') }}
        </div>
      </div>

      <div v-else class="card overflow-hidden">
        <div class="flex flex-col gap-3 border-b border-gray-100 p-4 dark:border-dark-700 md:flex-row md:items-center md:justify-between">
          <div class="min-w-0">
            <div class="text-xs font-medium text-gray-500 dark:text-dark-400">
              URL
            </div>
            <div class="mt-1 truncate font-mono text-sm text-gray-900 dark:text-dark-100">
              {{ iframeSrc }}
            </div>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button type="button" class="btn btn-secondary btn-sm" @click="openInNewTab">
              <Icon name="externalLink" size="sm" class="mr-1.5" :stroke-width="2" />
              {{ t('purchaseSubscription.openInNewTab') }}
            </button>
          </div>
        </div>

        <div class="bg-white dark:bg-dark-950">
          <iframe
            :src="iframeSrc"
            class="h-[75vh] w-full border-0"
            referrerpolicy="no-referrer"
            allowfullscreen
          ></iframe>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import { useAppStore } from '@/stores/app'

const { t } = useI18n()
const route = useRoute()
const appStore = useAppStore()

const purchaseSubscriptionEnabled = computed(() => appStore.cachedPublicSettings?.purchase_subscription_enabled ?? false)
const purchaseSubscriptionUrl = computed(() => (appStore.cachedPublicSettings?.purchase_subscription_url || '').trim())

function buildUrlWithParams(raw: string, params: Record<string, string>): string {
  if (!raw) return ''
  const hasParams = Object.keys(params).length > 0
  if (!hasParams) return raw
  try {
    const u = new URL(raw, window.location.origin)
    for (const [k, v] of Object.entries(params)) {
      if (!v) continue
      u.searchParams.set(k, v)
    }
    return u.toString()
  } catch {
    const sp = new URLSearchParams(params)
    const suffix = sp.toString()
    if (!suffix) return raw
    const join = raw.includes('?') ? '&' : '?'
    return `${raw}${join}${suffix}`
  }
}

const iframeSrc = computed(() => {
  const raw = purchaseSubscriptionUrl.value
  if (!raw) return ''

  const params: Record<string, string> = {}
  if (typeof route.query.tab === 'string' && route.query.tab) params.tab = route.query.tab
  if (typeof route.query.plan === 'string' && route.query.plan) params.plan = route.query.plan
  if (typeof route.query.period === 'string' && route.query.period) params.period = route.query.period

  return buildUrlWithParams(raw, params)
})

function openInNewTab() {
  if (!iframeSrc.value) return
  window.open(iframeSrc.value, '_blank', 'noopener,noreferrer')
}
</script>
