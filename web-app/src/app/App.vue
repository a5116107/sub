<script setup lang="ts">
import { onMounted } from 'vue'
import { useAppStore } from './stores'
import { ToastContainer, useToast } from '~/shared/ui'
import { useAuthStore } from '~/app/stores'
import { userApi } from '~/entities/user'

const appStore = useAppStore()
const authStore = useAuthStore()
const { toasts, remove } = useToast()

onMounted(() => {
  // Apply theme on app mount
  appStore.applyTheme()

  // Hydrate user on refresh when token exists
  if (authStore.token && !authStore.user) {
    userApi
      .getMe()
      .then(me => authStore.setUser(me as any))
      .catch(() => {
        // noop: 401 handler will redirect to /login if needed
      })
  }
})
</script>

<template>
  <router-view />

  <!-- Global Toast Container -->
  <ToastContainer
    :toasts="toasts"
    position="top-right"
    @close="remove"
  />
</template>
