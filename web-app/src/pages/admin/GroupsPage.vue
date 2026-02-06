<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { StatusBadge, LoadingState, EmptyState } from '~/widgets'
import { Button } from '~/shared/ui'

const { t } = useI18n()

const groups = [
  { id: 1, name: 'Default', platform: 'anthropic', status: 'active', subscription_type: 'standard' }
]
const isLoading = false
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-text-primary">{{ t('admin.groups.title') }}</h1>
        <p class="mt-1 text-text-secondary">Manage account groups.</p>
      </div>
      <Button variant="primary">+ {{ t('admin.groups.create') }}</Button>
    </div>

    <div class="bg-bg-primary rounded-xl shadow-sm border border-border overflow-hidden">
      <LoadingState v-if="isLoading" />
      <EmptyState
        v-else-if="!groups.length"
        icon="📁"
        title="No Groups"
        description="No groups found."
      />
      <table v-else class="w-full">
        <thead class="bg-bg-secondary border-b border-border">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Platform</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Type</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="group in groups" :key="group.id" class="hover:bg-bg-secondary/50">
            <td class="px-6 py-4 text-sm text-text-primary">{{ group.name }}</td>
            <td class="px-6 py-4 text-sm text-text-secondary">{{ group.platform }}</td>
            <td class="px-6 py-4 text-sm text-text-secondary">{{ group.subscription_type }}</td>
            <td class="px-6 py-4"><StatusBadge :status="group.status" /></td>
            <td class="px-6 py-4 text-right">
              <button class="text-primary-600 hover:text-primary-700 mr-3">Edit</button>
              <button class="text-error hover:text-error/80">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
