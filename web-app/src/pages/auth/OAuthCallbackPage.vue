<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { LoadingState } from '~/widgets'
import { STORAGE_KEYS, ROUTES } from '~/shared/config/constants'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

onMounted(() => {
  // Handle OAuth callback
  const token = route.query.token as string
  const error = route.query.error as string

  if (error) {
    console.error('OAuth error:', error)
    router.push(`${ROUTES.LOGIN}?error=${encodeURIComponent(error)}`)
    return
  }

  if (token) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token)
    router.push(ROUTES.DASHBOARD)
  } else {
    router.push(ROUTES.LOGIN)
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-bg-secondary">
    <LoadingState size="lg" :text="t('auth.oauth.loading')" />
  </div>
</template>
