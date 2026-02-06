<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUsageQuery } from '~/entities/usage'
import { LoadingState, EmptyState } from '~/widgets'
import { formatDate, formatCurrency } from '~/shared/utils'

const { t } = useI18n()

const page = ref(1)
const { data: usage, isLoading } = useUsageQuery({ page: page.value, page_size: 20 })
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-text-primary">{{ t('usage.title') }}</h1>
      <p class="mt-1 text-text-secondary">View your API usage history and statistics.</p>
    </div>

    <!-- Usage List -->
    <div class="bg-bg-primary rounded-xl shadow-sm border border-border overflow-hidden">
      <LoadingState v-if="isLoading" />

      <EmptyState
        v-else-if="!usage?.items?.length"
        icon="📊"
        title="No Usage Data"
        description="Your API usage will appear here once you start making requests."
      />

      <table v-else class="w-full">
        <thead class="bg-bg-secondary border-b border-border">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              {{ t('usage.model') }}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              {{ t('usage.tokens') }}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              {{ t('usage.cost') }}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              {{ t('common.createdAt') }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr
            v-for="log in usage.items"
            :key="log.id"
            class="hover:bg-bg-secondary/50 transition-colors"
          >
            <td class="px-6 py-4 text-sm font-medium text-text-primary">
              {{ log.model }}
            </td>
            <td class="px-6 py-4 text-sm text-text-secondary">
              {{ log.input_tokens + log.output_tokens }}
            </td>
            <td class="px-6 py-4 text-sm text-text-secondary">
              {{ formatCurrency(log.total_cost) }}
            </td>
            <td class="px-6 py-4 text-sm text-text-secondary">
              {{ formatDate(log.created_at) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
