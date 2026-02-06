<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useDashboardStatsQuery } from '~/entities/usage'
import { StatCard } from '~/widgets'
import { Card, Skeleton, Button } from '~/shared/ui'
import { formatCurrency, formatNumber } from '~/shared/utils'

const { t } = useI18n()

const { data: stats, isLoading } = useDashboardStatsQuery()
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-text-primary">{{ t('dashboard.title') }}</h1>
        <p class="mt-1 text-text-secondary">{{ t('dashboard.welcome') }}</p>
      </div>
      <Button variant="primary" size="sm" @click="$router.push('/usage')">
        {{ t('dashboard.viewUsage') }}
      </Button>
    </div>

    <!-- Stats Grid -->
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card v-for="i in 4" :key="i" variant="elevated" class="p-6">
        <div class="space-y-3">
          <Skeleton width="50%" height="16" />
          <Skeleton width="75%" height="32" />
        </div>
      </Card>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        :title="t('dashboard.stats.balance')"
        :value="formatCurrency(stats?.balance || 0)"
        icon="💰"
        :change="5.2"
        :change-label="t('dashboard.stats.fromLastMonth')"
      />
      <StatCard
        :title="t('dashboard.stats.totalRequests')"
        :value="formatNumber(stats?.total_requests || 0, 0)"
        icon="📊"
        :change="12.8"
        :change-label="t('dashboard.stats.fromLastMonth')"
      />
      <StatCard
        :title="t('dashboard.stats.totalTokens')"
        :value="formatCompactNumber(stats?.total_tokens || 0)"
        icon="📝"
        :change="-2.4"
        :change-label="t('dashboard.stats.fromLastMonth')"
      />
      <StatCard
        :title="t('dashboard.stats.activeApiKeys')"
        :value="formatNumber(stats?.active_api_keys || 0, 0)"
        icon="🔑"
      />
    </div>

    <!-- Recent Usage Section -->
    <Card variant="elevated" :title="t('dashboard.recentUsage')">
      <template #header-actions>
        <Button variant="ghost" size="sm" @click="$router.push('/usage')">
          {{ t('dashboard.viewAll') }} →
        </Button>
      </template>

      <div v-if="isLoading" class="space-y-4">
        <div v-for="i in 5" :key="i" class="flex items-center gap-4 py-3">
          <Skeleton variant="circular" width="40" height="40" />
          <div class="flex-1 space-y-2">
            <Skeleton width="30%" height="16" />
            <Skeleton width="50%" height="14" />
          </div>
          <Skeleton width="80" height="24" />
        </div>
      </div>

      <EmptyState
        v-else
        icon="📊"
        :title="t('dashboard.noUsageData')"
        :description="t('dashboard.noUsageDescription')"
      />
    </Card>
  </div>
</template>

<script lang="ts">
// Helper function for compact number formatting
function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value)
}
</script>
