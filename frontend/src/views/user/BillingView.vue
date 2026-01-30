<template>
  <AppLayout>
    <div class="mx-auto max-w-2xl space-y-6">
      <div class="page-header">
        <h1 class="page-title">{{ t('billing.title') }}</h1>
        <p class="page-description">{{ t('billing.description') }}</p>
      </div>

      <div class="card p-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
              <Icon name="creditCard" size="md" class="text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ t('billing.currentBalance') }}
              </div>
              <div class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                ${{ (authStore.user?.balance ?? 0).toFixed(2) }}
              </div>
              <div class="mt-1 text-sm text-gray-600 dark:text-dark-400">
                {{ t('billing.tip') }}
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button type="button" class="btn btn-secondary btn-sm" :disabled="loading" @click="refresh">
              <Icon name="refresh" size="sm" class="mr-1.5" :stroke-width="2" />
              {{ loading ? t('billing.refreshing') : t('billing.refresh') }}
            </button>
            <router-link to="/purchase" class="btn btn-primary btn-sm">
              <Icon name="creditCard" size="sm" class="mr-1.5" :stroke-width="2" />
              {{ t('billing.goToPurchase') }}
            </router-link>
          </div>
        </div>
      </div>

      <div v-if="error" class="card border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-900/20">
        <div class="flex items-start gap-3">
          <Icon name="ban" size="md" class="mt-0.5 text-red-600 dark:text-red-400" :stroke-width="2" />
          <div class="text-sm text-red-800 dark:text-red-300">
            {{ error }}
          </div>
        </div>
      </div>

      <div v-if="order" class="card p-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-sm font-medium text-gray-900 dark:text-white">{{ t('billing.orderTitle') }}</div>
            <div class="mt-1 text-sm text-gray-600 dark:text-dark-400">
              {{ t('billing.orderNo') }}: <span class="font-mono text-gray-900 dark:text-white">{{ order.order_no }}</span>
            </div>
          </div>
          <span class="badge" :class="statusBadgeClass">
            {{ statusLabel }}
          </span>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl border border-gray-200 bg-white/60 p-4 dark:border-dark-700/60 dark:bg-dark-800/60">
            <div class="text-xs font-medium text-gray-500 dark:text-dark-400">{{ t('billing.amount') }}</div>
            <div class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {{ order.currency }} {{ order.amount.toFixed(2) }}
            </div>
          </div>
          <div class="rounded-xl border border-gray-200 bg-white/60 p-4 dark:border-dark-700/60 dark:bg-dark-800/60">
            <div class="text-xs font-medium text-gray-500 dark:text-dark-400">{{ t('billing.provider') }}</div>
            <div class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {{ order.provider }}
              <span v-if="order.channel" class="text-sm font-medium text-gray-500 dark:text-dark-400">({{ order.channel }})</span>
            </div>
          </div>
        </div>

        <div class="mt-4 text-xs text-gray-500 dark:text-dark-400">
          {{ t('billing.orderHint') }}
        </div>
      </div>

      <div v-else class="card p-6">
        <div class="text-sm text-gray-700 dark:text-dark-200">
          {{ t('billing.noOrder') }}
        </div>
        <div class="mt-3 text-xs text-gray-500 dark:text-dark-400">
          {{ t('billing.noOrderHint') }}
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import { paymentsAPI, type PaymentOrder } from '@/api/payments'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const appStore = useAppStore()

const loading = ref(false)
const error = ref('')
const order = ref<PaymentOrder | null>(null)

const orderId = computed(() => {
  const fromQuery = typeof route.query.order_id === 'string' ? route.query.order_id : ''
  const fromStorage = localStorage.getItem('last_payment_order_id') || ''
  const raw = fromQuery || fromStorage
  const id = Number(raw)
  return Number.isFinite(id) && id > 0 ? id : 0
})

const statusLabel = computed(() => {
  switch (order.value?.status) {
    case 'paid':
      return t('billing.statusPaid')
    case 'failed':
      return t('billing.statusFailed')
    case 'canceled':
      return t('billing.statusCanceled')
    case 'expired':
      return t('billing.statusExpired')
    case 'pending':
    default:
      return t('billing.statusPending')
  }
})

const statusBadgeClass = computed(() => {
  switch (order.value?.status) {
    case 'paid':
      return 'badge-success'
    case 'failed':
    case 'canceled':
    case 'expired':
      return 'badge-danger'
    case 'pending':
    default:
      return 'badge-warning'
  }
})

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    // Always refresh user balance first (best effort).
    try {
      await authStore.refreshUser()
    } catch {
      // ignore; balance may still refresh later
    }

    if (!orderId.value) {
      order.value = null
      return
    }
    order.value = await paymentsAPI.getOrder(orderId.value)
  } catch (e) {
    const msg = (e as { message?: string }).message || t('billing.refreshFailed')
    error.value = msg
    appStore.showError(msg)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refresh()
})
</script>
