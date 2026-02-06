<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Button } from '~/shared/ui'
import { ROUTES } from '~/shared/config/constants'

const router = useRouter()

function goHome() {
  router.push(ROUTES.HOME)
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-bg-secondary px-4">
    <div class="text-center">
      <h1 class="text-6xl font-bold text-primary-600 mb-4">404</h1>
      <h2 class="text-2xl font-semibold text-text-primary mb-2">Page Not Found</h2>
      <p class="text-text-secondary mb-6">The page you are looking for does not exist.</p>
      <Button variant="primary" @click="goHome">
        Go Home
      </Button>
    </div>
  </div>
</template>
