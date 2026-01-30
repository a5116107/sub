<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="page-header">
        <h1 class="page-title">{{ t('purchase.title') }}</h1>
        <p class="page-description">{{ t('purchase.description') }}</p>
      </div>

      <div class="card p-6">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
              <Icon name="creditCard" size="md" class="text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ t('purchase.howToBuy.title') }}
              </div>
              <div class="mt-1 text-sm text-gray-600 dark:text-dark-400">
                {{ t('purchase.howToBuy.desc') }}
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <router-link to="/subscriptions" class="btn btn-secondary btn-sm">
              <Icon name="badge" size="sm" class="mr-1.5" :stroke-width="2" />
              {{ t('purchase.checkSubscriptions') }}
            </router-link>
            <router-link to="/redeem" class="btn btn-secondary btn-sm">
              <Icon name="gift" size="sm" class="mr-1.5" :stroke-width="2" />
              {{ t('dashboard.addBalanceWithCode') }}
            </router-link>
          </div>
        </div>

        <div v-if="contactInfo" class="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-900/40">
          <div class="text-xs font-medium text-gray-500 dark:text-dark-400">{{ t('purchase.contact') }}</div>
          <div class="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="font-mono text-sm text-gray-900 dark:text-gray-100">
              {{ contactInfo }}
            </div>
            <button type="button" class="btn btn-secondary btn-sm" @click="copyContactInfo">
              <Icon name="link" size="sm" class="mr-1.5" :stroke-width="2" />
              {{ t('purchase.copyContact') }}
            </button>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
              <Icon name="dollar" size="md" class="text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ t('purchase.onlineTopupTitle') }}
              </div>
              <div class="mt-1 text-sm text-gray-600 dark:text-dark-400">
                {{ t('purchase.onlineTopupDesc') }}
              </div>
            </div>
          </div>

          <router-link to="/billing" class="btn btn-secondary btn-sm">
            <Icon name="clock" size="sm" class="mr-1.5" :stroke-width="2" />
            {{ t('billing.title') }}
          </router-link>
        </div>

        <div v-if="providersLoading" class="mt-4 text-sm text-gray-600 dark:text-dark-400">
          {{ t('common.loading') }}
        </div>

        <div
          v-else-if="providers.length === 0"
          class="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-dark-700 dark:bg-dark-900/40 dark:text-dark-200"
        >
          <div class="font-medium">{{ t('purchase.paymentUnavailable') }}</div>
          <div class="mt-1 text-xs text-gray-500 dark:text-dark-400">
            {{ t('purchase.paymentUnavailableHint') }}
          </div>
        </div>

        <form v-else class="mt-4 grid gap-4 md:grid-cols-3" @submit.prevent="createTopupOrder">
          <div>
            <label class="input-label">{{ t('purchase.amountLabel') }}</label>
            <input
              v-model.number="topupAmount"
              type="number"
              min="0"
              :step="amountStep"
              class="input"
              :placeholder="t('purchase.amountLabel')"
            />
          </div>

          <div>
            <label class="input-label">{{ t('purchase.providerLabel') }}</label>
            <select v-model="topupProvider" class="input">
              <option v-for="p in providers" :key="p.provider" :value="p.provider">
                {{ providerLabel(p.provider) }}
              </option>
            </select>
          </div>

          <div v-if="channelOptions.length">
            <label class="input-label">{{ t('purchase.channelLabel') }}</label>
            <select v-model="topupChannel" class="input">
              <option v-for="ch in channelOptions" :key="ch" :value="ch">
                {{ ch }}
              </option>
            </select>
          </div>
          <div v-else class="hidden md:block" />

          <div class="md:col-span-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button type="submit" class="btn btn-primary" :disabled="creatingOrder">
              {{ creatingOrder ? t('purchase.creatingOrder') : t('purchase.createOrder') }}
              <Icon name="arrowRight" size="sm" class="ml-1.5" :stroke-width="2" />
            </button>
          </div>
        </form>
      </div>

      <div class="card p-6">
        <div class="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div class="tabs">
            <button
              v-if="landingPricingEnabled"
              type="button"
              class="tab"
              :class="{ 'tab-active': pricingTab === 'subscription' }"
              @click="setTab('subscription')"
            >
              {{ pricing.subscription.title }}
            </button>
            <button
              type="button"
              class="tab"
              :class="{ 'tab-active': pricingTab === 'payg' }"
              @click="setTab('payg')"
            >
              {{ pricing.payg.title }}
            </button>
          </div>

          <div
            v-if="landingPricingEnabled && pricingTab === 'subscription'"
            class="flex flex-col items-center gap-2"
          >
            <div class="tabs">
              <button
                v-for="p in subscriptionPeriods"
                :key="p.key"
                type="button"
                class="tab"
                :class="{ 'tab-active': pricingPeriod === p.key }"
                @click="setPeriod(p.key)"
              >
                {{ p.label }}
              </button>
            </div>
            <p v-if="pricingPeriod === 'custom'" class="text-center text-xs text-gray-500 dark:text-dark-400">
              {{ t('home.pricing.customHint') }}
            </p>
          </div>
        </div>

        <div
          v-if="landingPricingEnabled && pricingTab === 'subscription'"
          class="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          <button
            v-for="plan in visibleSubscriptionPlans"
            :key="plan.id"
            type="button"
            class="text-left"
            @click="selectPlan(plan.id)"
          >
            <div
              class="h-full rounded-2xl border border-gray-200/60 bg-white/70 p-5 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 dark:border-dark-800/70 dark:bg-dark-950/35"
              :class="
                selectedPlanId === plan.id
                  ? plan.id === 'enterprise'
                    ? 'ring-2 ring-gold-500/35 shadow-lg shadow-gold-500/10'
                    : 'ring-2 ring-primary-500/40 shadow-glow'
                  : plan.id === 'enterprise'
                    ? 'hover:shadow-lg hover:shadow-gold-500/10'
                    : 'hover:shadow-lg hover:shadow-primary-500/10'
              "
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2">
                    <div class="text-base font-semibold text-gray-900 dark:text-white">{{ plan.name }}</div>
                    <span
                      v-if="plan.badge"
                      class="badge"
                      :class="
                        plan.id === 'enterprise'
                          ? 'badge-gold'
                          : plan.highlighted
                            ? 'badge-primary'
                            : 'badge-gray'
                      "
                    >
                      {{ plan.badge }}
                    </span>
                  </div>
                  <div v-if="plan.description" class="mt-1 text-sm text-gray-600 dark:text-dark-400">
                    {{ plan.description }}
                  </div>
                </div>
                <Icon v-if="selectedPlanId === plan.id" name="checkCircle" size="md" class="text-primary-500" :stroke-width="2" />
              </div>

              <div class="mt-4 flex items-baseline gap-2">
                <div class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{
                    plan.price.custom
                      ? plan.price.custom
                      : formatCny(pricingPeriod === 'week' ? plan.price.week ?? 0 : plan.price.month ?? 0)
                  }}
                </div>
                <div v-if="!plan.price.custom && pricingPeriod !== 'custom'" class="text-sm text-gray-500 dark:text-dark-400">
                  /{{ periodLabel(pricingPeriod) }}
                </div>
              </div>

              <ul class="mt-4 space-y-2 text-sm text-gray-700 dark:text-dark-200">
                <li v-for="(f, idx) in plan.features" :key="idx" class="flex items-start gap-2">
                  <Icon name="check" size="sm" class="mt-0.5 text-primary-500" :stroke-width="2" />
                  <span>{{ f }}</span>
                </li>
              </ul>
            </div>
          </button>
        </div>

        <div v-else class="mt-6 rounded-2xl border border-gray-200/70 bg-white/60 p-6 backdrop-blur-sm dark:border-dark-700/60 dark:bg-dark-800/60">
          <div class="text-sm text-gray-600 dark:text-dark-400">
            {{ pricing.payg.subtitle }}
          </div>
          <ul class="mt-4 space-y-2 text-sm text-gray-700 dark:text-dark-200">
            <li v-for="(f, idx) in pricing.payg.features" :key="idx" class="flex items-start gap-2">
              <Icon name="check" size="sm" class="mt-0.5 text-primary-500" :stroke-width="2" />
              <span>{{ f }}</span>
            </li>
          </ul>
          <div v-if="pricing.payg.note" class="mt-4 text-xs text-gray-500 dark:text-dark-400">
            {{ pricing.payg.note }}
          </div>
        </div>

        <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="text-sm text-gray-600 dark:text-dark-400">
            <span class="font-medium text-gray-900 dark:text-white">{{ t('purchase.selected') }}:</span>
            <span class="ml-2">
              {{
                landingPricingEnabled && pricingTab === 'subscription'
                  ? (selectedPlan?.name || t('purchase.notSelected'))
                  : pricing.payg.title
              }}
            </span>
          </div>
          <button type="button" class="btn btn-primary" @click="handleNextStep">
            {{ t('purchase.nextStep') }}
            <Icon name="arrowRight" size="sm" class="ml-1.5" :stroke-width="2" />
          </button>
        </div>

        <p v-if="pricing.note" class="mt-4 text-center text-xs text-gray-500 dark:text-dark-400">
          {{ pricing.note }}
        </p>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import { useAppStore } from '@/stores/app'
import { paymentsAPI, type PaymentProviderInfo } from '@/api/payments'
import {
  formatCny,
  parseLandingPricingConfig,
  type PricingPeriod,
  type PricingTab
} from '@/utils/landingPricing'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const contactInfo = computed(() => appStore.cachedPublicSettings?.contact_info || appStore.contactInfo || '')
const landingPricingEnabled = computed(() => appStore.cachedPublicSettings?.landing_pricing_enabled ?? true)

const providers = ref<PaymentProviderInfo[]>([])
const providersLoading = ref(false)
const creatingOrder = ref(false)

const topupAmount = ref<number>(10)
const topupProvider = ref<string>('')
const topupChannel = ref<string>('')

const channelOptions = computed(() => {
  const p = providers.value.find((x) => x.provider === topupProvider.value)
  return p?.channels ? [...p.channels] : []
})

const amountStep = computed(() => (topupProvider.value === 'creem' ? 1 : 0.01))

function providerLabel(provider: string): string {
  if (provider === 'creem') return 'Creem'
  if (provider === 'paypal') return 'PayPal'
  if (provider === 'epay') return 'EasyPay'
  return provider
}

watch(
  () => topupProvider.value,
  () => {
    const channels = channelOptions.value
    if (!channels.length) {
      topupChannel.value = ''
      return
    }
    if (!topupChannel.value || !channels.includes(topupChannel.value)) {
      topupChannel.value = channels[0]
    }
  },
  { immediate: true }
)

onMounted(async () => {
  providersLoading.value = true
  try {
    providers.value = await paymentsAPI.listProviders()
    if (providers.value.length && !topupProvider.value) {
      topupProvider.value = providers.value[0].provider
    }
  } catch {
    providers.value = []
  } finally {
    providersLoading.value = false
  }
})

const pricingParseResult = computed(() =>
  parseLandingPricingConfig(appStore.cachedPublicSettings?.landing_pricing_config || '')
)
const pricing = computed(() => pricingParseResult.value.config)

type DisplayPeriod = PricingPeriod

const pricingTab = ref<PricingTab>('subscription')
const pricingPeriod = ref<DisplayPeriod>('month')
const selectedPlanId = ref<string>('')

watch(
  landingPricingEnabled,
  (enabled) => {
    if (!enabled && pricingTab.value === 'subscription') {
      pricingTab.value = 'payg'
    }
  },
  { immediate: true }
)

const selectedPlan = computed(() => {
  return pricing.value.subscription.plans.find((p) => p.id === selectedPlanId.value) || null
})

const subscriptionPeriods = computed(() => {
  const periods = pricing.value.subscription.periods
  const hasCustomPlan = pricing.value.subscription.plans.some((p) => !!p.price.custom)
  return hasCustomPlan ? periods : periods.filter((p) => p.key !== 'custom')
})

const visibleSubscriptionPlans = computed(() => {
  const plans = pricing.value.subscription.plans
  if (pricingPeriod.value !== 'custom') return plans
  const customPlans = plans.filter((p) => !!p.price.custom)
  return customPlans.length ? customPlans : plans
})

function periodLabel(key: DisplayPeriod): string {
  const found = pricing.value.subscription.periods.find((p) => p.key === key)
  return found?.label || (key === 'week' ? '周付' : key === 'custom' ? '自定义' : '月付')
}

function normalizeTab(raw: any): PricingTab {
  return raw === 'payg' ? 'payg' : 'subscription'
}

function normalizePeriod(raw: any): DisplayPeriod | undefined {
  return raw === 'week' || raw === 'month' || raw === 'custom' ? raw : undefined
}

function setTab(tab: PricingTab) {
  pricingTab.value = tab
  syncQuery()
}

function setPeriod(period: DisplayPeriod) {
  pricingPeriod.value = period
  if (pricingTab.value === 'subscription' && period === 'custom') {
    const firstCustom = pricing.value.subscription.plans.find((p) => !!p.price.custom)
    if (firstCustom) {
      selectedPlanId.value = firstCustom.id
    }
  }
  syncQuery()
}

function selectPlan(planId: string) {
  selectedPlanId.value = planId
  syncQuery()
}

function syncQuery() {
  const nextQuery: Record<string, any> = { ...route.query }
  nextQuery.tab = pricingTab.value
  if (pricingTab.value === 'subscription') {
    nextQuery.period = pricingPeriod.value
    if (selectedPlanId.value) nextQuery.plan = selectedPlanId.value
  } else {
    delete nextQuery.period
    delete nextQuery.plan
  }
  router.replace({ query: nextQuery })
}

watch(
  [pricing, () => route.query.tab, () => route.query.period, () => route.query.plan],
  ([cfg, tabQ, periodQ, planQ]) => {
    const nextTab = normalizeTab(tabQ)
    pricingTab.value = landingPricingEnabled.value ? nextTab : 'payg'
    const hasCustomPlan = cfg.subscription.plans.some((p) => !!p.price.custom)
    const defaultPeriod: DisplayPeriod =
      cfg.subscription.default_period === 'custom' ? 'custom' : cfg.subscription.default_period
    const nextPeriod = normalizePeriod(periodQ) ?? defaultPeriod
    pricingPeriod.value = nextPeriod === 'custom' && !hasCustomPlan ? 'month' : nextPeriod

    if (landingPricingEnabled.value && pricingTab.value === 'subscription') {
      const rawPlan = typeof planQ === 'string' ? planQ : ''
      const visiblePlans =
        pricingPeriod.value === 'custom'
          ? cfg.subscription.plans.filter((p) => !!p.price.custom)
          : cfg.subscription.plans
      const fallbackPlans = visiblePlans.length ? visiblePlans : cfg.subscription.plans
      const exists = fallbackPlans.some((p) => p.id === rawPlan)
      selectedPlanId.value = exists
        ? rawPlan
        : selectedPlanId.value || fallbackPlans[0]?.id || ''
    }
  },
  { immediate: true }
)

async function copyContactInfo() {
  try {
    if (!contactInfo.value) return
    await navigator.clipboard.writeText(contactInfo.value)
    appStore.showSuccess(t('purchase.contactCopied'))
  } catch {
    appStore.showError(t('common.copyFailed'))
  }
}

async function createTopupOrder() {
  if (creatingOrder.value) return
  if (!topupProvider.value) {
    appStore.showError(t('purchase.providerRequired'))
    return
  }
  if (!Number.isFinite(topupAmount.value) || topupAmount.value <= 0) {
    appStore.showError(t('purchase.amountRequired'))
    return
  }
  if (channelOptions.value.length && !topupChannel.value) {
    appStore.showError(t('purchase.channelRequired'))
    return
  }

  creatingOrder.value = true
  try {
    const res = await paymentsAPI.createTopUp({
      amount: topupAmount.value,
      provider: topupProvider.value,
      channel: topupChannel.value
    })
    localStorage.setItem('last_payment_order_id', String(res.order_id))
    localStorage.setItem('last_payment_order_no', res.order_no)
    localStorage.setItem('last_payment_checkout_url', res.checkout_url)
    window.location.href = res.checkout_url
  } catch (e) {
    appStore.showError((e as { message?: string }).message || t('common.error'))
  } finally {
    creatingOrder.value = false
  }
}

function handleNextStep() {
  if (pricingTab.value === 'subscription' && !selectedPlanId.value) {
    appStore.showError(t('purchase.pleaseSelectPlan'))
    return
  }
  if (!contactInfo.value) {
    appStore.showInfo(t('purchase.noContactInfo'))
    return
  }
  appStore.showInfo(t('purchase.nextStepToast'))
}
</script>
