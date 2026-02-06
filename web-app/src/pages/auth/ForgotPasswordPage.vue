<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useForgotPasswordMutation } from '~/entities/auth'
import { Button, Input, Card } from '~/shared/ui'
import { useToast } from '~/shared/composables/useToast'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()

// State
const email = ref('')
const submitted = ref(false)

// Mutations
const forgotPasswordMutation = useForgotPasswordMutation()

// Computed
const isValidEmail = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.value)
})

// Methods
async function handleSubmit() {
  if (!isValidEmail.value) {
    toast.error(t('auth.forgotPassword.errors.invalidEmail', 'Please enter a valid email address'))
    return
  }

  try {
    await forgotPasswordMutation.mutateAsync({ email: email.value })
    submitted.value = true
    toast.success(t('auth.forgotPassword.success', 'Password reset instructions have been sent to your email'))
  } catch (error: any) {
    toast.error(error.message || t('auth.forgotPassword.errors.failed', 'Failed to send reset email'))
  }
}

function goToLogin() {
  router.push({ name: 'Login' })
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] px-4 py-12">
    <Card class="w-full max-w-md p-8">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-[var(--text-primary)]">
          {{ t('auth.forgotPassword.title', 'Forgot Password') }}
        </h1>
        <p class="text-sm text-[var(--text-secondary)] mt-2">
          {{ t('auth.forgotPassword.subtitle', 'Enter your email to receive password reset instructions') }}
        </p>
      </div>

      <!-- Success State -->
      <div v-if="submitted" class="text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <span class="text-3xl">✓</span>
        </div>
        <h2 class="text-lg font-semibold text-[var(--text-primary)] mb-2">
          {{ t('auth.forgotPassword.sent.title', 'Check your email') }}
        </h2>
        <p class="text-sm text-[var(--text-secondary)] mb-6">
          {{ t('auth.forgotPassword.sent.description', { email: email }) }}
        </p>
        <Button variant="secondary" class="w-full" @click="goToLogin">
          {{ t('auth.forgotPassword.backToLogin', 'Back to Login') }}
        </Button>
      </div>

      <!-- Form -->
      <form v-else @submit.prevent="handleSubmit">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {{ t('auth.forgotPassword.email', 'Email') }}
            </label>
            <Input
              v-model="email"
              type="email"
              :placeholder="t('auth.forgotPassword.emailPlaceholder', 'Enter your email address')"
              :disabled="forgotPasswordMutation.isPending.value"
              required
            />
          </div>

          <Button
            type="submit"
            class="w-full"
            :loading="forgotPasswordMutation.isPending.value"
            :disabled="!email.trim()"
          >
            {{ t('auth.forgotPassword.submit', 'Send Reset Link') }}
          </Button>
        </div>

        <div class="mt-6 text-center">
          <button
            type="button"
            class="text-sm text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] dark:text-[var(--color-primary-400)]"
            @click="goToLogin"
          >
            {{ t('auth.forgotPassword.backToLogin', 'Back to Login') }}
          </button>
        </div>
      </form>
    </Card>
  </div>
</template>
