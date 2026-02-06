<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useApiKeysQuery, useCreateApiKeyMutation, useDeleteApiKeyMutation } from '~/entities/api-key'
import { StatusBadge, LoadingState, EmptyState } from '~/widgets'
import { Card, Button, Dialog, Input, useToast } from '~/shared/ui'
import { formatDate, maskApiKey } from '~/shared/utils'
import type { CreateAPIKeyInput, APIKey } from '~/entities/api-key'

const { t } = useI18n()
const toast = useToast()

const { data: apiKeys, isLoading } = useApiKeysQuery({ page: 1, page_size: 20 })
const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const selectedKey = ref<APIKey | null>(null)

const createMutation = useCreateApiKeyMutation()
const deleteMutation = useDeleteApiKeyMutation()

const newKeyForm = ref<CreateAPIKeyInput>({
  name: '',
  group_id: 1,
  allow_balance: true,
  allow_subscription: true
})
const quotaLimitInput = ref('')

function copyKey(key: string) {
  navigator.clipboard.writeText(key)
  toast.success(t('apiKeys.copySuccess'))
}

async function handleCreate() {
  if (!newKeyForm.value.name) {
    toast.error(t('apiKeys.nameRequired'))
    return
  }

  try {
    const formData = { ...newKeyForm.value }
    if (quotaLimitInput.value) {
      formData.quota_limit_usd = Number(quotaLimitInput.value)
    }
    await createMutation.mutateAsync(formData)
    toast.success(t('apiKeys.createSuccess'))
    showCreateDialog.value = false
    newKeyForm.value = { name: '', group_id: 1, allow_balance: true, allow_subscription: true }
    quotaLimitInput.value = ''
  } catch {
    toast.error(t('apiKeys.createError'))
  }
}

function confirmDelete(key: APIKey) {
  selectedKey.value = key
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!selectedKey.value) return

  try {
    await deleteMutation.mutateAsync(selectedKey.value.id)
    toast.success(t('apiKeys.deleteSuccess'))
    showDeleteDialog.value = false
    selectedKey.value = null
  } catch {
    toast.error(t('apiKeys.deleteError'))
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-text-primary">{{ t('apiKeys.title') }}</h1>
        <p class="mt-1 text-text-secondary">{{ t('apiKeys.description') }}</p>
      </div>
      <Button variant="primary" @click="showCreateDialog = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        {{ t('apiKeys.create') }}
      </Button>
    </div>

    <!-- API Keys List -->
    <Card variant="elevated" :padding="'none'">
      <LoadingState v-if="isLoading" />

      <EmptyState
        v-else-if="!apiKeys?.items?.length"
        icon="🔑"
        :title="t('apiKeys.emptyTitle')"
        :description="t('apiKeys.emptyDescription')"
        :action-label="t('apiKeys.create')"
        @action="showCreateDialog = true"
      />

      <table v-else class="w-full">
        <thead class="bg-bg-secondary border-b border-border">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              {{ t('apiKeys.name') }}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              {{ t('apiKeys.key') }}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              {{ t('apiKeys.status') }}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              {{ t('apiKeys.quotaUsed') }}
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
            v-for="key in apiKeys.items"
            :key="key.id"
            class="hover:bg-bg-secondary/50 transition-colors"
          >
            <td class="px-6 py-4 text-sm font-medium text-text-primary">
              {{ key.name }}
            </td>
            <td class="px-6 py-4 text-sm text-text-secondary font-mono">
              {{ maskApiKey(key.key) }}
            </td>
            <td class="px-6 py-4">
              <StatusBadge :status="key.status" />
            </td>
            <td class="px-6 py-4 text-sm text-text-secondary">
              ${{ key.quota_used_usd.toFixed(2) }}
              <span v-if="key.quota_limit_usd">
                / ${{ key.quota_limit_usd.toFixed(2) }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-text-secondary">
              {{ formatDate(key.created_at) }}
            </td>
            <td class="px-6 py-4 text-right text-sm">
              <div class="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  @click="copyKey(key.key)"
                >
                  {{ t('common.copy') }}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  @click="confirmDelete(key)"
                >
                  {{ t('common.delete') }}
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </Card>

    <!-- Create API Key Dialog -->
    <Dialog
      v-model="showCreateDialog"
      :title="t('apiKeys.createTitle')"
      size="md"
    >
      <div class="space-y-4">
        <Input
          v-model="newKeyForm.name"
          :label="t('apiKeys.nameLabel')"
          :placeholder="t('apiKeys.namePlaceholder')"
          required
        />
        <Input
          v-model="quotaLimitInput"
          type="number"
          :label="t('apiKeys.quotaLimit')"
          :placeholder="t('apiKeys.quotaLimitPlaceholder')"
        />
      </div>

      <template #footer="{ close }">
        <Button variant="ghost" @click="close">
          {{ t('common.cancel') }}
        </Button>
        <Button
          variant="primary"
          :loading="createMutation.isPending.value"
          @click="handleCreate"
        >
          {{ t('common.create') }}
        </Button>
      </template>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog
      v-model="showDeleteDialog"
      :title="t('apiKeys.deleteTitle')"
      size="sm"
    >
      <p class="text-text-secondary">
        {{ t('apiKeys.deleteConfirm', { name: selectedKey?.name }) }}
      </p>

      <template #footer="{ close }">
        <Button variant="ghost" @click="close">
          {{ t('common.cancel') }}
        </Button>
        <Button
          variant="danger"
          :loading="deleteMutation.isPending.value"
          @click="handleDelete"
        >
          {{ t('common.delete') }}
        </Button>
      </template>
    </Dialog>
  </div>
</template>
