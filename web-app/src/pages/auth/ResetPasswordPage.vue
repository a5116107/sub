<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useResetPasswordMutation } from '~/entities/auth'
import { Button, Input, Card } from '~/shared/ui'
import { useToast } from '~/shared/composables/useToast'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const toast = useToast()

// State
const email = ref('')
const token = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const submitted = ref(false)
const tokenValid = ref(true)

// Mutations
const resetPasswordMutation = useResetPasswordMutation()

// Get token and email from URL
onMounted(() => {
  token.value = (route.query.token as string) || ''
  email.value = (route.query.email as string) || ''

  if (!token.value) {
    tokenValid.value = false
  }
})

// Computed
const passwordsMatch = computed(() => newPassword.value === confirmPassword.value)
const isValidPassword = computed(() => newPassword.value.length >= 8)

// Methods
async function handleSubmit() {
  if (!isValidPassword.value) {
    toast.error(t('auth.resetPassword.errors.passwordTooShort', 'Password must be at least 8 characters'))
    return
  }

  if (!passwordsMatch.value) {
    toast.error(t('auth.resetPassword.errors.passwordMismatch', 'Passwords do not match'))
    return
  }

  try {
    await resetPasswordMutation.mutateAsync({
      email: email.value,
      token: token.value,
      new_password: newPassword.value
    })
    submitted.value = true
    toast.success(t('auth.resetPassword.success', 'Password has been reset successfully'))
  } catch (error: any) {
    toast.error(error.message || t('auth.resetPassword.errors.failed', 'Failed to reset password'))
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
          {{ t('auth.resetPassword.title', 'Reset Password') }}
        </h1>
        <p class="text-sm text-[var(--text-secondary)] mt-2">
          {{ t('auth.resetPassword.subtitle', 'Enter your new password') }}
        </p>
      </div>

      <!-- Invalid Token State -->
      <div v-if="!tokenValid" class="text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <span class="text-3xl">✕</span>
        </div>
        <h2 class="text-lg font-semibold text-[var(--text-primary)] mb-2">
          {{ t('auth.resetPassword.invalidToken.title', 'Invalid or Expired Link') }}
        </h2>
        <p class="text-sm text-[var(--text-secondary)] mb-6">
          {{ t('auth.resetPassword.invalidToken.description', 'This password reset link is invalid or has expired. Please request a new one.') }}
        </p>
        <Button variant="secondary" class="w-full" @click="router.push({ name: 'ForgotPassword' })">
          {{ t('auth.resetPassword.requestNew', 'Request New Link') }}
        </Button>
      </div>

      <!-- Success State -->
      <div v-else-if="submitted" class="text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <span class="text-3xl">✓</span>
        </div>
        <h2 class="text-lg font-semibold text-[var(--text-primary)] mb-2">
          {{ t('auth.resetPassword.success.title', 'Password Reset') }}
        </h2>
        <p class="text-sm text-[var(--text-secondary)] mb-6">
          {{ t('auth.resetPassword.success.description', 'Your password has been reset successfully. You can now log in with your new password.') }}
        </p>
        <Button class="w-full" @click="goToLogin">
          {{ t('auth.resetPassword.goToLogin', 'Go to Login') }}
        </Button>
      </div>

      <!-- Form -->
      <form v-else @submit.prevent="handleSubmit">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {{ t('auth.resetPassword.newPassword', 'New Password') }}
            </label>
            <Input
              v-model="newPassword"
              type="password"
              :placeholder="t('auth.resetPassword.newPasswordPlaceholder', 'Enter new password')"
              :disabled="resetPasswordMutation.isPending.value"
              required
            />
            <p class="text-xs text-[var(--text-tertiary)] mt-1">
              {{ t('auth.resetPassword.passwordHint', 'At least 8 characters') }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {{ t('auth.resetPassword.confirmPassword', 'Confirm Password') }}
            </label>
            <Input
              v-model="confirmPassword"
              type="password"
              :placeholder="t('auth.resetPassword.confirmPasswordPlaceholder', 'Confirm new password')"
              :disabled="resetPasswordMutation.isPending.value"
              required
            />
            <p
              v-if="confirmPassword && !passwordsMatch"
              class="text-xs text-red-500 mt-1"
            >
              {{ t('auth.resetPassword.errors.passwordMismatch', 'Passwords do not match') }}
            </p>
          </div>

          <Button
            type="submit"
            class="w-full"
            :loading="resetPasswordMutation.isPending.value"
            :disabled="!newPassword || !confirmPassword || !passwordsMatch"
          >
            {{ t('auth.resetPassword.submit', 'Reset Password') }}
          </Button>
        </div>

        <div class="mt-6 text-center">
          <button
            type="button"
            class="text-sm text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] dark:text-[var(--color-primary-400)]"
            @click="goToLogin"
          >
            {{ t('auth.resetPassword.backToLogin', 'Back to Login') }}
          </button>
        </div>
      </form>
    </Card>
  </div>
</template>
