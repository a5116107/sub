<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { StatusBadge, LoadingState, EmptyState } from '~/widgets'
import { Button } from '~/shared/ui'
import { formatDate, formatCurrency } from '~/shared/utils'

const { t } = useI18n()

// Placeholder data
const users = [
  { id: 1, email: 'user@example.com', username: 'user1', role: 'user', balance: 100, status: 'active', created_at: '2024-01-01' },
  { id: 2, email: 'admin@example.com', username: 'admin', role: 'admin', balance: 0, status: 'active', created_at: '2024-01-01' }
]

const isLoading = false
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-text-primary">{{ t('admin.users.title') }}</h1>
        <p class="mt-1 text-text-secondary">Manage system users.</p>
      </div>
      <Button variant="primary">
        + {{ t('admin.users.create') }}
      </Button>
    </div>

    <!-- Users Table -->
    <div class="bg-bg-primary rounded-xl shadow-sm border border-border overflow-hidden">
      <LoadingState v-if="isLoading" />

      <EmptyState
        v-else-if="!users.length"
        icon="👥"
        title="No Users"
        description="No users found in the system."
      />

      <table v-else class="w-full">
        <thead class="bg-bg-secondary border-b border-border">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              {{ t('admin.users.email') }}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              {{ t('admin.users.username') }}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              {{ t('admin.users.role') }}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              {{ t('admin.users.balance') }}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              {{ t('admin.users.status') }}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              {{ t('common.createdAt') }}
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
              {{ t('common.actions') }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr
            v-for="user in users"
            :key="user.id"
            class="hover:bg-bg-secondary/50 transition-colors"
          >
            <td class="px-6 py-4 text-sm text-text-primary">{{ user.email }}</td>
            <td class="px-6 py-4 text-sm text-text-secondary">{{ user.username }}</td>
            <td class="px-6 py-4"><StatusBadge :status="user.role" /></td>
            <td class="px-6 py-4 text-sm text-text-secondary">{{ formatCurrency(user.balance) }}</td>
            <td class="px-6 py-4"><StatusBadge :status="user.status" /></td>
            <td class="px-6 py-4 text-sm text-text-secondary">{{ formatDate(user.created_at) }}</td>
            <td class="px-6 py-4 text-right text-sm">
              <button class="text-primary-600 hover:text-primary-700 font-medium mr-3">
                {{ t('common.edit') }}
              </button>
              <button class="text-error hover:text-error/80">
                {{ t('common.delete') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
