<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { StatCard } from '~/widgets'
import { formatCurrency, formatNumber } from '~/shared/utils'

const { t } = useI18n()

// Placeholder data - would be fetched from admin API
const stats = {
  totalUsers: 1234,
  totalAccounts: 56,
  totalRequests: 1234567,
  totalRevenue: 12345.67
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-text-primary">{{ t('admin.dashboard.title') }}</h1>
      <p class="mt-1 text-text-secondary">System overview and statistics.</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Users"
        :value="formatNumber(stats.totalUsers, 0)"
        icon="👥"
      />
      <StatCard
        title="Total Accounts"
        :value="formatNumber(stats.totalAccounts, 0)"
        icon="🔐"
      />
      <StatCard
        title="Total Requests"
        :value="formatCompactNumber(stats.totalRequests)"
        icon="📊"
      />
      <StatCard
        title="Total Revenue"
        :value="formatCurrency(stats.totalRevenue)"
        icon="💰"
      />
    </div>

    <!-- Charts Placeholder -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-bg-primary rounded-xl shadow-sm border border-border p-6">
        <h2 class="text-lg font-semibold text-text-primary mb-4">Usage Trends</h2>
        <div class="h-64 flex items-center justify-center text-text-tertiary">
          Charts will be displayed here
        </div>
      </div>

      <div class="bg-bg-primary rounded-xl shadow-sm border border-border p-6">
        <h2 class="text-lg font-semibold text-text-primary mb-4">Revenue Trends</h2>
        <div class="h-64 flex items-center justify-center text-text-tertiary">
          Charts will be displayed here
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value)
}
</script>
