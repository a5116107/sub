<template>
  <div class="card-interactive p-5">
    <!-- Header: Name & Status -->
    <div class="flex items-start justify-between mb-4">
      <div class="flex items-center gap-2">
        <h3 class="font-semibold text-gray-900 dark:text-white">{{ apiKey.name }}</h3>
        <Icon
          v-if="apiKey.ip_whitelist?.length > 0 || apiKey.ip_blacklist?.length > 0"
          name="shield"
          size="sm"
          class="text-blue-500"
          :title="t('keys.ipRestrictionEnabled')"
        />
      </div>
      <span :class="['badge', apiKey.status === 'active' ? 'badge-success' : 'badge-gray']">
        {{ t('admin.accounts.status.' + apiKey.status) }}
      </span>
    </div>

    <!-- API Key -->
    <div class="mb-4">
      <div class="flex items-center gap-2">
        <code class="code text-xs flex-1 truncate">{{ maskKey(apiKey.key) }}</code>
        <button
          @click="copyKey"
          class="rounded-lg p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-dark-700"
          :class="copied ? 'text-green-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'"
          :title="copied ? t('keys.copied') : t('keys.copyToClipboard')"
        >
          <Icon v-if="copied" name="check" size="sm" :stroke-width="2" />
          <Icon v-else name="clipboard" size="sm" />
        </button>
      </div>
    </div>

    <!-- Group Badge -->
    <div class="mb-4">
      <GroupBadge
        v-if="apiKey.group"
        :name="apiKey.group.name"
        :platform="apiKey.group.platform"
        :subscription-type="apiKey.group.subscription_type"
        :rate-multiplier="apiKey.group.rate_multiplier"
      />
      <span v-else class="text-sm text-gray-400 dark:text-dark-500">{{ t('keys.noGroup') }}</span>
    </div>

    <!-- Usage Stats -->
    <div class="border-t border-gray-100 dark:border-dark-700 pt-4 mb-4">
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p class="text-gray-500 dark:text-gray-400">{{ t('keys.today') }}</p>
          <p class="font-medium text-gray-900 dark:text-white">${{ (usageStats?.today_actual_cost ?? 0).toFixed(4) }}</p>
        </div>
        <div>
          <p class="text-gray-500 dark:text-gray-400">{{ t('keys.total') }}</p>
          <p class="font-medium text-gray-900 dark:text-white">${{ (usageStats?.total_actual_cost ?? 0).toFixed(4) }}</p>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2 border-t border-gray-100 dark:border-dark-700 pt-4">
      <button
        @click="$emit('use', apiKey)"
        class="btn btn-sm btn-ghost flex-1"
      >
        <Icon name="terminal" size="sm" class="mr-1" />
        {{ t('keys.useKey') }}
      </button>
      <button
        @click="$emit('edit', apiKey)"
        class="btn btn-sm btn-ghost"
      >
        <Icon name="edit" size="sm" />
      </button>
      <button
        @click="$emit('delete', apiKey)"
        class="btn btn-sm btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        <Icon name="trash" size="sm" />
      </button>
    </div>

    <!-- Created Date -->
    <p class="text-xs text-gray-400 dark:text-dark-500 mt-3 text-center">
      {{ t('keys.created') }}: {{ formatDateTime(apiKey.created_at) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import GroupBadge from '@/components/common/GroupBadge.vue'
import { useClipboard } from '@/composables/useClipboard'
import { formatDateTime } from '@/utils/format'
import type { ApiKey } from '@/types'
import type { BatchApiKeyUsageStats } from '@/api/usage'

const { t } = useI18n()
const { copyToClipboard: clipboardCopy } = useClipboard()

interface Props {
  apiKey: ApiKey
  usageStats?: BatchApiKeyUsageStats
}

const props = defineProps<Props>()

defineEmits<{
  use: [key: ApiKey]
  edit: [key: ApiKey]
  delete: [key: ApiKey]
}>()

const copied = ref(false)

const maskKey = (key: string): string => {
  if (key.length <= 12) return key
  return `${key.slice(0, 8)}...${key.slice(-4)}`
}

const copyKey = async () => {
  const success = await clipboardCopy(props.apiKey.key, t('keys.copied'))
  if (success) {
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 800)
  }
}
</script>
