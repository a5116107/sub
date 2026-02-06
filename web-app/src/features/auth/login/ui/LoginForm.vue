<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useMutation } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import { z } from 'zod'
import { onMounted, onUnmounted, computed, ref } from 'vue'
import { Button, Input } from '~/shared/ui'
import { useAuthStore } from '~/app/stores'
import { post } from '~/shared/api/client'
import { STORAGE_KEYS, ROUTES } from '~/shared/config/constants'
import type { AuthResponse, TotpLoginResponse } from '~/shared/api/types'
import { useToast } from '~/shared/ui'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const emit = defineEmits<{
  'totp-required': [data: TotpLoginResponse]
}>()

// 演示账号配置（开发环境使用）
type DemoAccountKey = 'admin@example.com' | 'user@example.com'
const DEMO_ACCOUNTS: Record<DemoAccountKey, { password: string; role: string; token: string }> = {
  'admin@example.com': {
    password: 'admin123456',
    role: 'admin',
    token: 'demo_admin_token_' + Date.now()
  },
  'user@example.com': {
    password: 'user123456',
    role: 'user',
    token: 'demo_user_token_' + Date.now()
  }
}

const values = ref({
  email: '',
  password: '',
  turnstile_token: ''
})
const errors = ref<Record<string, string>>({})
const isSubmitting = ref(false)

const isCaptchaEnabled = computed(() => {
  const key = (import.meta as any).env?.VITE_TURNSTILE_SITE_KEY
  return typeof key === 'string' && key.length > 0 && key !== 'your-site-key'
})

const turnstileSiteKey = computed(() => (import.meta as any).env?.VITE_TURNSTILE_SITE_KEY as string | undefined)

// 检查当前是否是演示账号
const isDemoAccount = computed(() => {
  const email = values.value.email as DemoAccountKey
  const account = DEMO_ACCOUNTS[email]
  return account && account.password === values.value.password
})

// 表单提交处理
async function handleSubmit() {
  console.log('Login form submitted', values.value)

  // 验证
  errors.value = {}

  // 邮箱验证
  if (!values.value.email || !z.string().email().safeParse(values.value.email).success) {
    errors.value.email = t('errors.validation')
  }

  // 密码验证
  if (!values.value.password) {
    errors.value.password = t('auth.login.password') + ' ' + t('common.required')
  }

  // 检查是否是演示账号
  const email = values.value.email as DemoAccountKey
  const demoAccount = DEMO_ACCOUNTS[email]
  const isDemo = demoAccount && demoAccount.password === values.value.password

  // 非演示账号需要验证码（仅在启用 Turnstile 时）
  if (isCaptchaEnabled.value && !isDemo && !values.value.turnstile_token) {
    errors.value.turnstile_token = 'Please complete the captcha'
  }

  if (Object.keys(errors.value).length > 0) {
    return
  }

  // 提交登录
  await handleLogin(values.value)
}

function setValue(field: string, value: any) {
  values.value[field as keyof typeof values.value] = value
  // 清除错误
  if (errors.value[field]) {
    delete errors.value[field]
  }
}

function setValues(newValues: Partial<typeof values.value>) {
  Object.assign(values.value, newValues)
  errors.value = {}
}

// 监听临时账号填充事件
function handleFillDemoCredentials(event: CustomEvent<{ email: string; password: string }>) {
  setValues({
    email: event.detail.email,
    password: event.detail.password,
    turnstile_token: 'demo-token' // 临时绕过验证码
  })
}

onMounted(() => {
  window.addEventListener('fill-demo-credentials', handleFillDemoCredentials as (e: Event) => void)
})

onUnmounted(() => {
  window.removeEventListener('fill-demo-credentials', handleFillDemoCredentials as (e: Event) => void)
})

const loginMutation = useMutation({
  mutationFn: async (data: { email: string; password: string; turnstile_token: string }) => {
    return post<AuthResponse | TotpLoginResponse>('/auth/login', data)
  },
  onSuccess: (data) => {
    if ('requires_2fa' in data && data.requires_2fa) {
      emit('totp-required', data)
      return
    }

    if ('access_token' in data) {
      authStore.setToken(data.access_token)
      if ('user' in data && data.user) {
        authStore.setUser(data.user)
      }
      router.push(ROUTES.DASHBOARD)
    }
  },
  onError: (err: unknown) => {
    const message =
      (typeof err === 'object' && err && 'message' in err && typeof (err as any).message === 'string' && (err as any).message) ||
      t('errors.validation')
    toast.error(message)
  }
})

async function handleLogin(formData: { email: string; password: string; turnstile_token: string }) {
  console.log('handleLogin called', formData.email)

  // 检查是否是演示账号
  const demoAccount = DEMO_ACCOUNTS[formData.email as keyof typeof DEMO_ACCOUNTS]
  if (demoAccount && demoAccount.password === formData.password) {
    console.log('Demo account detected, logging in...')
    console.log('STORAGE_KEYS.TOKEN =', STORAGE_KEYS.TOKEN)

    // 先更新 localStorage - 直接使用字符串 key
    const tokenKey = 'token'
    localStorage.setItem(tokenKey, demoAccount.token)
    console.log('localStorage token set:', localStorage.getItem(tokenKey))

    // 更新 auth store
    authStore.setToken(demoAccount.token)
    authStore.setUser({
      id: demoAccount.role === 'admin' ? 1 : 2,
      email: formData.email,
      username: demoAccount.role === 'admin' ? 'Admin' : 'User',
      role: demoAccount.role,
      balance: 1000,
      concurrency: 10,
      status: 'active',
      invite_code: 'DEMO_CODE',
      allowed_groups: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any)

    console.log('Auth store updated, store.token =', authStore.token)

    // 延迟跳转，确保状态更新和 localStorage 写入完成
    setTimeout(async () => {
      console.log('Before navigate: localStorage token =', localStorage.getItem('token'))
      await router.push('/dashboard')
      console.log('After navigate: router.currentRoute =', router.currentRoute.value.path)
    }, 100)
    return
  }

  // 非演示账号，正常请求后端
  console.log('Normal login, calling API...')
  await loginMutation.mutateAsync(formData)
}

// Expose Turnstile callbacks for external use via defineExpose
defineExpose({
  onTurnstileVerify: (token: string) => setValue('turnstile_token', token),
  onTurnstileExpire: () => setValue('turnstile_token', '')
})
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <Input
      v-model="values.email"
      type="email"
      :label="t('auth.login.email')"
      :placeholder="t('auth.login.email')"
      :error="errors.email"
      required
      @blur="() => {}"
    />

    <Input
      v-model="values.password"
      type="password"
      :label="t('auth.login.password')"
      :placeholder="t('auth.login.password')"
      :error="errors.password"
      required
      @blur="() => {}"
    />

    <!-- Turnstile -->
    <div
      v-if="isCaptchaEnabled"
      class="cf-turnstile"
      :data-sitekey="turnstileSiteKey"
      data-callback="onTurnstileVerify"
    ></div>

    <div v-if="loginMutation.error.value" class="p-3 bg-error/10 text-error rounded-lg text-sm">
      {{ (loginMutation.error.value as any)?.message || t('errors.generic') }}
    </div>

    <Button
      type="submit"
      variant="primary"
      block
      :loading="isSubmitting"
      :disabled="(!values.email || !values.password) || (isCaptchaEnabled && !values.turnstile_token && !isDemoAccount)"
    >
      {{ t('auth.login.submit') }}
    </Button>
  </form>
</template>
