<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { RegisterForm } from '~/features/auth'
import { ROUTES } from '~/shared/config/constants'

const { t } = useI18n()
const router = useRouter()

function goToLogin() {
  router.push(ROUTES.LOGIN)
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-bg-secondary px-4 py-12">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-primary-600">Sub2API</h1>
        <p class="mt-2 text-text-secondary">{{ t('auth.register.subtitle') }}</p>
      </div>

      <!-- Register Form -->
      <div class="bg-bg-primary rounded-xl shadow-sm border border-border p-8">
        <RegisterForm />

        <div class="mt-6 pt-6 border-t border-border text-center text-sm">
          <span class="text-text-secondary">{{ t('auth.register.hasAccount') }}</span>
          <button
            class="ml-1 text-primary-600 hover:text-primary-700 font-medium"
            @click="goToLogin"
          >
            {{ t('auth.register.login') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
