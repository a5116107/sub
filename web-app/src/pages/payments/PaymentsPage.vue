<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  usePaymentProvidersQuery,
  usePaymentOrdersQuery,
  useCreateOrderMutation
} from '~/entities/payment'
import type { PaymentProvider, PaymentChannel, PaymentOrder } from '~/entities/payment'
import { Button, Input, Card, Badge, Dialog, Skeleton } from '~/shared/ui'
import { EmptyState } from '~/widgets'
import { useToast } from '~/shared/composables/useToast'

const { t } = useI18n()
const toast = useToast()

// State
const currentPage = ref(1)
const pageSize = ref(10)
const showCreateDialog = ref(false)
const selectedProvider = ref<PaymentProvider | null>(null)
const selectedChannel = ref<PaymentChannel | null>(null)
const amount = ref('10')

// Queries
const { data: providersData, isLoading: providersLoading } = usePaymentProvidersQuery()
const { data: ordersData, isLoading: ordersLoading } = usePaymentOrdersQuery({
  page: currentPage.value,
  page_size: pageSize.value
})

// Mutations
const createOrderMutation = useCreateOrderMutation()

// Computed
const providers = computed(() => providersData.value?.filter(p => p.enabled) || [])
const orders = computed(() => ordersData.value?.items || [])
const totalPages = computed(() => Math.ceil((ordersData.value?.total || 0) / pageSize.value))

// Methods
function openCreateDialog() {
  selectedProvider.value = null
  selectedChannel.value = null
  amount.value = '10'
  showCreateDialog.value = true
}

function selectProvider(provider: PaymentProvider) {
  selectedProvider.value = provider
  selectedChannel.value = provider.channels?.[0] || null
}

async function handleCreateOrder() {
  if (!selectedProvider.value) {
    toast.error(t('payments.errors.selectProvider', 'Please select a payment provider'))
    return
  }

  if (Number(amount.value) <= 0) {
    toast.error(t('payments.errors.invalidAmount', 'Please enter a valid amount'))
    return
  }

  try {
    const result = await createOrderMutation.mutateAsync({
      amount: Number(amount.value),
      provider: selectedProvider.value.id,
      channel: selectedChannel.value?.id
    })

    showCreateDialog.value = false

    // Open checkout URL in new tab
    if (result.checkout_url) {
      window.open(result.checkout_url, '_blank')
    }

    toast.success(t('payments.orderCreated', 'Order created successfully'))
  } catch (error: any) {
    toast.error(error.message || t('payments.errors.createFailed', 'Failed to create order'))
  }
}

function handlePay(order: PaymentOrder) {
  if (order.checkout_url) {
    window.open(order.checkout_url, '_blank')
  }
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'paid':
      return 'success'
    case 'pending':
      return 'warning'
    case 'failed':
    case 'canceled':
    case 'expired':
      return 'danger'
    default:
      return 'default'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return t('payments.status.pending', 'Pending')
    case 'paid':
      return t('payments.status.paid', 'Paid')
    case 'failed':
      return t('payments.status.failed', 'Failed')
    case 'canceled':
      return t('payments.status.canceled', 'Canceled')
    case 'expired':
      return t('payments.status.expired', 'Expired')
    default:
      return status
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatAmount(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency
  }).format(amount)
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-4xl">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-[var(--text-primary)]">
          {{ t('payments.title', 'Payments') }}
        </h1>
        <p class="text-sm text-[var(--text-secondary)] mt-1">
          {{ t('payments.subtitle', 'Top up your account balance') }}
        </p>
      </div>

      <Button @click="openCreateDialog">
        {{ t('payments.topUp', 'Top Up') }}
      </Button>
    </div>

    <!-- Orders Section -->
    <div>
      <h2 class="text-lg font-semibold text-[var(--text-primary)] mb-4">
        {{ t('payments.orders.title', 'Order History') }}
      </h2>

      <!-- Loading state -->
      <div v-if="ordersLoading" class="space-y-3">
        <Card v-for="i in 3" :key="i" class="p-4">
          <div class="flex items-center justify-between">
            <div class="space-y-2">
              <Skeleton class="h-4 w-32" />
              <Skeleton class="h-3 w-24" />
            </div>
            <Skeleton class="h-6 w-20" />
          </div>
        </Card>
      </div>

      <!-- Empty state -->
      <EmptyState
        v-else-if="orders.length === 0"
        :title="t('payments.orders.empty.title', 'No orders yet')"
        :description="t('payments.orders.empty.description', 'Your payment orders will appear here.')"
        icon="💳"
      />

      <!-- Orders list -->
      <div v-else class="space-y-3">
        <Card
          v-for="order in orders"
          :key="order.id"
          class="p-4"
        >
          <div class="flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-medium text-[var(--text-primary)]">
                  {{ order.order_no }}
                </span>
                <Badge :variant="getStatusVariant(order.status)" size="sm">
                  {{ getStatusLabel(order.status) }}
                </Badge>
              </div>
              <div class="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
                <span>{{ order.provider }}</span>
                <span>{{ formatDate(order.created_at) }}</span>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-lg font-semibold text-[var(--text-primary)]">
                {{ formatAmount(order.amount, order.currency) }}
              </span>
              <div class="flex gap-2">
                <Button
                  v-if="order.status === 'pending' && order.checkout_url"
                  variant="secondary"
                  size="sm"
                  @click="handlePay(order)"
                >
                  {{ t('payments.pay', 'Pay') }}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-6">
        <Button
          variant="secondary"
          size="sm"
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          {{ t('common.previous', 'Previous') }}
        </Button>

        <span class="text-sm text-[var(--text-secondary)] px-4">
          {{ currentPage }} / {{ totalPages }}
        </span>

        <Button
          variant="secondary"
          size="sm"
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          {{ t('common.next', 'Next') }}
        </Button>
      </div>
    </div>

    <!-- Create Order Dialog -->
    <Dialog :model-value="showCreateDialog" @update:model-value="showCreateDialog = $event">
      <template #title>
        {{ t('payments.topUp', 'Top Up') }}
      </template>

      <div class="space-y-6">
        <!-- Amount Input -->
        <div>
          <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">
            {{ t('payments.amount', 'Amount') }}
          </label>
          <div class="flex items-center gap-2">
            <span class="text-lg text-[var(--text-secondary)]">$</span>
            <Input
              v-model="amount"
              type="number"
              min="1"
              step="1"
              class="flex-1"
            />
          </div>
          <div class="flex gap-2 mt-2">
            <Button
              v-for="preset in [10, 20, 50, 100]"
              :key="preset"
              variant="secondary"
              size="sm"
              :class="{ 'ring-2 ring-[var(--color-primary-500)]': Number(amount) === preset }"
              @click="amount = String(preset)"
            >
              ${{ preset }}
            </Button>
          </div>
        </div>

        <!-- Provider Selection -->
        <div>
          <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">
            {{ t('payments.provider', 'Payment Method') }}
          </label>

          <div v-if="providersLoading" class="space-y-2">
            <Skeleton v-for="i in 2" :key="i" class="h-16 w-full" />
          </div>

          <div v-else-if="providers.length === 0" class="text-sm text-[var(--text-tertiary)] text-center py-4">
            {{ t('payments.noProviders', 'No payment methods available') }}
          </div>

          <div v-else class="space-y-2">
            <button
              v-for="provider in providers"
              :key="provider.id"
              class="w-full p-4 rounded-lg border-2 transition-colors text-left"
              :class="[
                selectedProvider?.id === provider.id
                  ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-900)]/20'
                  : 'border-[var(--border-primary)] hover:border-[var(--color-primary-300)]'
              ]"
              @click="selectProvider(provider)"
            >
              <div class="flex items-center gap-3">
                <span v-if="provider.icon" class="text-2xl">{{ provider.icon }}</span>
                <span class="font-medium text-[var(--text-primary)]">{{ provider.name }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Channel Selection (if provider has channels) -->
        <div v-if="selectedProvider?.channels && selectedProvider.channels.length > 1">
          <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">
            {{ t('payments.channel', 'Payment Channel') }}
          </label>
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="channel in selectedProvider.channels"
              :key="channel.id"
              :variant="selectedChannel?.id === channel.id ? 'primary' : 'secondary'"
              size="sm"
              @click="selectedChannel = channel"
            >
              {{ channel.name }}
            </Button>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <Button variant="secondary" @click="showCreateDialog = false">
            {{ t('common.cancel', 'Cancel') }}
          </Button>
          <Button
            :loading="createOrderMutation.isPending.value"
            :disabled="!selectedProvider || Number(amount) <= 0"
            @click="handleCreateOrder"
          >
            {{ t('payments.createOrder', 'Create Order') }}
          </Button>
        </div>
      </template>
    </Dialog>
  </div>
</template>
