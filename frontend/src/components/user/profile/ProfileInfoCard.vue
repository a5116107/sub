<template>
  <div class="card overflow-hidden">
    <div
      class="border-b border-gray-100 bg-gradient-to-r from-primary-500/10 to-primary-600/5 px-6 py-5 dark:border-dark-700 dark:from-primary-500/20 dark:to-primary-600/10"
    >
      <div class="flex items-center gap-4">
        <!-- Avatar -->
        <div
          class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-2xl font-bold text-white shadow-lg shadow-primary-500/20"
        >
          {{ user?.email?.charAt(0).toUpperCase() || 'U' }}
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="truncate text-lg font-semibold text-gray-900 dark:text-white">
            {{ user?.email }}
          </h2>
          <div class="mt-1 flex items-center gap-2">
            <span :class="['badge', user?.role === 'admin' ? 'badge-primary' : 'badge-gray']">
              {{ user?.role === 'admin' ? t('profile.administrator') : t('profile.user') }}
            </span>
            <span
              :class="['badge', user?.status === 'active' ? 'badge-success' : 'badge-danger']"
            >
              {{ user?.status }}
            </span>
          </div>
        </div>
      </div>
    </div>
    <div class="px-6 py-4">
      <div class="space-y-3">
        <div class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
          <Icon name="mail" size="sm" class="text-gray-400 dark:text-gray-500" />
          <span class="truncate">{{ user?.email }}</span>
        </div>
        <div
          v-if="user?.username"
          class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400"
        >
          <Icon name="user" size="sm" class="text-gray-400 dark:text-gray-500" />
          <span class="truncate">{{ user.username }}</span>
        </div>
        <div
          v-if="inviteCode"
          class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400"
        >
          <Icon name="link" size="sm" class="text-gray-400 dark:text-gray-500" />
          <span class="truncate font-mono">{{ inviteCode }}</span>
          <div class="ml-auto flex items-center gap-2">
            <button type="button" class="btn btn-secondary btn-sm" @click="copyInviteCode">
              {{ t('profile.copyInviteCode') }}
            </button>
            <button type="button" class="btn btn-primary btn-sm" @click="copyInviteLink">
              {{ t('profile.copyInviteLink') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import Icon from '@/components/icons/Icon.vue'
import type { User } from '@/types'

const props = defineProps<{
  user: User | null
}>()

const { t } = useI18n()
const appStore = useAppStore()

const inviteCode = computed(() => props.user?.invite_code?.trim() || '')
const inviteLink = computed(() =>
  inviteCode.value
    ? `${window.location.origin}/register?promo=${encodeURIComponent(inviteCode.value)}`
    : ''
)

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    appStore.showSuccess(t('common.copiedToClipboard'))
  } catch (error) {
    console.error('Failed to copy:', error)
    appStore.showError(t('common.copyFailed'))
  }
}

function copyInviteCode() {
  if (!inviteCode.value) return
  void copyText(inviteCode.value)
}

function copyInviteLink() {
  if (!inviteLink.value) return
  void copyText(inviteLink.value)
}
</script>
