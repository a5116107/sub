<template>
  <Teleport to="body">
    <div v-if="show && position">
      <!-- Backdrop: click anywhere outside to close -->
      <div class="fixed inset-0 z-[9998]" @click="emit('close')"></div>
      <div
        class="action-menu-content dropdown fixed z-[9999] w-52 overflow-hidden"
        :style="{ top: position.top + 'px', left: position.left + 'px' }"
        @click.stop
      >
        <div>
          <template v-if="account">
            <button @click="$emit('test', account); $emit('close')" class="dropdown-item w-full">
              <Icon name="play" size="sm" class="text-green-500" :stroke-width="2" />
              {{ t('admin.accounts.testConnection') }}
            </button>
            <button @click="$emit('stats', account); $emit('close')" class="dropdown-item w-full">
              <Icon name="chart" size="sm" class="text-indigo-500" />
              {{ t('admin.accounts.viewStats') }}
            </button>
            <template v-if="account.type === 'oauth' || account.type === 'setup-token'">
              <button @click="$emit('reauth', account); $emit('close')" class="dropdown-item w-full text-blue-600 dark:text-blue-400">
                <Icon name="link" size="sm" />
                {{ t('admin.accounts.reAuthorize') }}
              </button>
              <button @click="$emit('refresh-token', account); $emit('close')" class="dropdown-item w-full text-purple-600 dark:text-purple-400">
                <Icon name="refresh" size="sm" />
                {{ t('admin.accounts.refreshToken') }}
              </button>
              <button
                v-if="isGoogleOneGeminiOAuth"
                @click="$emit('refresh-tier', account); $emit('close')"
                class="dropdown-item w-full text-teal-700 dark:text-teal-300"
              >
                <Icon name="database" size="sm" />
                {{ t('admin.accounts.refreshTier') }}
              </button>
            </template>
            <div v-if="account.status === 'error' || isRateLimited || isOverloaded" class="my-1 border-t border-gray-100 dark:border-dark-700"></div>
            <button v-if="account.status === 'error'" @click="$emit('reset-status', account); $emit('close')" class="dropdown-item w-full text-yellow-600 dark:text-yellow-400">
              <Icon name="sync" size="sm" />
              {{ t('admin.accounts.resetStatus') }}
            </button>
            <button v-if="isRateLimited || isOverloaded" @click="$emit('clear-rate-limit', account); $emit('close')" class="dropdown-item w-full text-amber-600 dark:text-amber-400">
              <Icon name="clock" size="sm" />
              {{ t('admin.accounts.clearRateLimit') }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@/components/icons'
import type { Account } from '@/types'

const props = defineProps<{ show: boolean; account: Account | null; position: { top: number; left: number } | null }>()
const emit = defineEmits(['close', 'test', 'stats', 'reauth', 'refresh-token', 'refresh-tier', 'reset-status', 'clear-rate-limit'])
const { t } = useI18n()
const isRateLimited = computed(() => {
  if (props.account?.rate_limit_reset_at && new Date(props.account.rate_limit_reset_at) > new Date()) {
    return true
  }
  const modelLimits = (props.account?.extra as Record<string, unknown> | undefined)?.model_rate_limits as
    | Record<string, { rate_limit_reset_at: string }>
    | undefined
  if (modelLimits) {
    const now = new Date()
    return Object.values(modelLimits).some((info) => new Date(info.rate_limit_reset_at) > now)
  }
  return false
})
const isOverloaded = computed(() => props.account?.overload_until && new Date(props.account.overload_until) > new Date())
const isGoogleOneGeminiOAuth = computed(() => {
  const account = props.account
  if (!account) return false
  if (account.platform !== 'gemini' || account.type !== 'oauth') return false
  const oauthType = account.credentials?.['oauth_type']
  return oauthType === 'google_one'
})

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') emit('close')
}

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      window.addEventListener('keydown', handleKeydown)
    } else {
      window.removeEventListener('keydown', handleKeydown)
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>
