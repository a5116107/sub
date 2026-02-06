<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMutation } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import { z } from 'zod'
import { Button, Input } from '~/shared/ui'
import { useForm } from '~/shared/composables'
import { post } from '~/shared/api/client'
import { STORAGE_KEYS, ROUTES } from '~/shared/config/constants'
import type { AuthResponse } from '~/shared/api/types'

const { t } = useI18n()
const router = useRouter()

const emailVerifyEnabled = ref(true) // Should come from public settings
const countdown = ref(0)

const registerSchema = z.object({
  email: z.string().email(t('errors.validation')),
  password: z.string().min(6, t('auth.register.password') + ' min 6 chars'),
  confirmPassword: z.string(),
  verify_code: z.string().length(6, '6 digits').optional(),
  turnstile_token: z.string().min(1, 'Captcha required'),
  promo_code: z.string().optional()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

type RegisterFormValues = {
  email: string
  password: string
  confirmPassword: string
  verify_code: string
  turnstile_token: string
  promo_code: string
}

const { values, errors, isSubmitting, handleSubmit, setValue } = useForm<RegisterFormValues>({
  initialValues: {
    email: '',
    password: '',
    confirmPassword: '',
    verify_code: '',
    turnstile_token: '',
    promo_code: ''
  },
  schema: registerSchema,
  onSubmit: handleRegister
})

const canSendCode = computed(() => {
  return values.value.email && !countdown.value && values.value.turnstile_token
})

const registerMutation = useMutation({
  mutationFn: async (data: { email: string; password: string; verify_code?: string; turnstile_token: string; promo_code?: string }) => {
    return post<AuthResponse>('/auth/register', data)
  },
  onSuccess: (data) => {
    localStorage.setItem(STORAGE_KEYS.TOKEN, data.access_token)
    router.push(ROUTES.DASHBOARD)
  }
})

const sendCodeMutation = useMutation({
  mutationFn: async (data: { email: string; turnstile_token: string }) => {
    return post<{ message: string; countdown: number }>('/auth/send-verify-code', data)
  },
  onSuccess: (data) => {
    countdown.value = data.countdown
    startCountdown()
  }
})

async function handleRegister(formData: RegisterFormValues) {
  const { confirmPassword: _unusedConfirmPassword, ...registerData } = formData
  void _unusedConfirmPassword // Explicitly mark as intentionally unused
  await registerMutation.mutateAsync(registerData)
}

async function sendVerifyCode() {
  if (!canSendCode.value) return
  await sendCodeMutation.mutateAsync({
    email: values.value.email,
    turnstile_token: values.value.turnstile_token
  })
}

function startCountdown() {
  const interval = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(interval)
    }
  }, 1000)
}

// Expose Turnstile callback for external use
defineExpose({
  onTurnstileVerify: (token: string) => setValue('turnstile_token', token)
})
</script>

<template>
  <form class="space-y-4" @submit="handleSubmit">
    <Input
      v-model="values.email"
      type="email"
      :label="t('auth.register.email')"
      :placeholder="t('auth.register.email')"
      :error="errors.email"
      required
      @blur="() => {}"
    />

    <Input
      v-model="values.password"
      type="password"
      :label="t('auth.register.password')"
      :placeholder="t('auth.register.password')"
      :error="errors.password"
      required
      @blur="() => {}"
    />

    <Input
      v-model="values.confirmPassword"
      type="password"
      :label="t('auth.register.confirmPassword')"
      :placeholder="t('auth.register.confirmPassword')"
      :error="errors.confirmPassword"
      required
      @blur="() => {}"
    />

    <!-- Verification Code -->
    <div v-if="emailVerifyEnabled" class="flex gap-2">
      <Input
        v-model="values.verify_code"
        type="text"
        :label="t('auth.register.verifyCode')"
        :placeholder="t('auth.register.verifyCode')"
        :error="errors.verify_code"
        class="flex-1"
        @blur="() => {}"
      />
      <Button
        type="button"
        variant="secondary"
        :disabled="!canSendCode"
        class="mt-6"
        @click="sendVerifyCode"
      >
        {{ countdown > 0 ? `${countdown}s` : t('auth.register.sendCode') }}
      </Button>
    </div>

    <Input
      v-model="values.promo_code"
      type="text"
      :label="t('auth.register.promoCode')"
      :placeholder="t('auth.register.promoCode')"
      @blur="() => {}"
    />

    <!-- Turnstile placeholder -->
    <div class="cf-turnstile" data-sitekey="your-site-key" data-callback="onTurnstileVerify"></div>

    <div v-if="registerMutation.error.value" class="p-3 bg-error/10 text-error rounded-lg text-sm">
      {{ registerMutation.error.value.message || t('errors.generic') }}
    </div>

    <Button
      type="submit"
      variant="primary"
      block
      :loading="isSubmitting"
      :disabled="!values.turnstile_token"
    >
      {{ t('auth.register.submit') }}
    </Button>
  </form>
</template>
