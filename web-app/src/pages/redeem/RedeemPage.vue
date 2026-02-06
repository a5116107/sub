<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRedeemMutation, useRedeemHistoryQuery } from '~/entities/redeem'
import type { RedeemResponse } from '~/entities/redeem'
import { Button, Input, Card, Badge, Skeleton } from '~/shared/ui'
import { EmptyState } from '~/widgets'
import { useToast } from '~/shared/composables/useToast'

const { t } = useI18n()
const toast = useToast()

// State
const redeemCode = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const redeemResult = ref<RedeemResponse | null>(null)

// Queries
const { data: historyData, isLoading: historyLoading } = useRedeemHistoryQuery({
  page: currentPage.value,
  page_size: pageSize.value
})

// Mutations
const redeemMutation = useRedeemMutation()

// Computed
const history = computed(() => historyData.value?.items || [])
const totalPages = computed(() => Math.ceil((historyData.value?.total || 0) / pageSize.value))

// Methods
async function handleRedeem() {
  if (!redeemCode.value.trim()) {
    toast.error(t('redeem.errors.emptyCode', 'Please enter a redeem code'))
    return
  }

  try {
    const result = await redeemMutation.mutateAsync({ code: redeemCode.value.trim() })
    redeemResult.value = result
    redeemCode.value = ''

    toast.success(getSuccessMessage(result))
  } catch (error: any) {
    toast.error(error.message || t('redeem.errors.failed', 'Failed to redeem code'))
  }
}

function getSuccessMessage(result: RedeemResponse): string {
  switch (result.type) {
    case 'balance':
      return t('redeem.success.balance', `Successfully added $${result.amount?.toFixed(2)} to your balance`)
    case 'concurrency':
      return t('redeem.success.concurrency', `Successfully added ${result.amount} concurrency slots`)
    case 'subscription':
      return t('redeem.success.subscription', `Successfully activated ${result.days} days subscription for ${result.group_name}`)
    default:
      return t('redeem.success.generic', 'Code redeemed successfully')
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'balance':
      return t('redeem.types.balance', 'Balance')
    case 'concurrency':
      return t('redeem.types.concurrency', 'Concurrency')
    case 'subscription':
      return t('redeem.types.subscription', 'Subscription')
    default:
      return type
  }
}

function getTypeVariant(type: string): 'default' | 'success' | 'warning' {
  switch (type) {
    case 'balance':
      return 'success'
    case 'subscription':
      return 'warning'
    default:
      return 'default'
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

function formatRedeemValue(item: { type: string; amount?: number; days?: number; group_name?: string }): string {
  switch (item.type) {
    case 'balance':
      return `$${item.amount?.toFixed(2) || '0.00'}`
    case 'concurrency':
      return `+${item.amount || 0}`
    case 'subscription':
      return `${item.days || 0} days - ${item.group_name || ''}`
    default:
      return '-'
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-4xl">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-[var(--text-primary)]">
        {{ t('redeem.title', 'Redeem Code') }}
      </h1>
      <p class="text-sm text-[var(--text-secondary)] mt-1">
        {{ t('redeem.subtitle', 'Enter your redeem code to add balance, concurrency, or subscription') }}
      </p>
    </div>

    <!-- Redeem Form -->
    <Card class="p-6 mb-8">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="flex-1">
          <Input
            v-model="redeemCode"
            :placeholder="t('redeem.placeholder', 'Enter your redeem code')"
            :disabled="redeemMutation.isPending.value"
            class="w-full"
            @keyup.enter="handleRedeem"
          />
        </div>
        <Button
          :loading="redeemMutation.isPending.value"
          :disabled="!redeemCode.trim()"
          @click="handleRedeem"
        >
          {{ t('redeem.submit', 'Redeem') }}
        </Button>
      </div>

      <!-- Success Result -->
      <div
        v-if="redeemResult"
        class="mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
      >
        <div class="flex items-center gap-2 text-green-700 dark:text-green-400">
          <span class="text-lg">✓</span>
          <span class="font-medium">{{ getSuccessMessage(redeemResult) }}</span>
        </div>
      </div>
    </Card>

    <!-- History Section -->
    <div>
      <h2 class="text-lg font-semibold text-[var(--text-primary)] mb-4">
        {{ t('redeem.history.title', 'Redeem History') }}
      </h2>

      <!-- Loading state -->
      <div v-if="historyLoading" class="space-y-3">
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
        v-else-if="history.length === 0"
        :title="t('redeem.history.empty.title', 'No redeem history')"
        :description="t('redeem.history.empty.description', 'Your redeemed codes will appear here.')"
        icon="🎟️"
      />

      <!-- History list -->
      <div v-else class="space-y-3">
        <Card
          v-for="item in history"
          :key="item.id"
          class="p-4"
        >
          <div class="flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <code class="text-sm font-mono text-[var(--text-primary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded">
                  {{ item.code }}
                </code>
                <Badge :variant="getTypeVariant(item.type)" size="sm">
                  {{ getTypeLabel(item.type) }}
                </Badge>
              </div>
              <p class="text-xs text-[var(--text-tertiary)]">
                {{ formatDate(item.created_at) }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-sm font-medium text-[var(--text-primary)]">
                {{ formatRedeemValue(item) }}
              </p>
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
  </div>
</template>
