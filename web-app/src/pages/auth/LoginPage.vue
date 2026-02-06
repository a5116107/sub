<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { LoginForm } from '~/features/auth'
import { Button } from '~/shared/ui'
import { ROUTES } from '~/shared/config/constants'
import type { TotpLoginResponse } from '~/shared/api/types'

const { t } = useI18n()
const router = useRouter()

const showTotp = ref(false)
const totpData = ref<TotpLoginResponse | null>(null)
const loginFormRef = ref<InstanceType<typeof LoginForm>>()

// 临时管理员账号密码（仅开发环境使用）
const DEMO_CREDENTIALS = {
  admin: {
    email: 'admin@example.com',
    password: 'admin123456'
  },
  user: {
    email: 'user@example.com',
    password: 'user123456'
  }
}

function handleTotpRequired(data: TotpLoginResponse) {
  totpData.value = data
  showTotp.value = true
}

function goToRegister() {
  router.push(ROUTES.REGISTER)
}

function goToForgotPassword() {
  router.push(ROUTES.FORGOT_PASSWORD)
}

function fillDemoCredentials(type: 'admin' | 'user') {
  const credentials = DEMO_CREDENTIALS[type]
  // 通过事件派发方式传递临时账号
  window.dispatchEvent(new CustomEvent('fill-demo-credentials', {
    detail: credentials
  }))
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-bg-secondary px-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-primary-600">Sub2API</h1>
        <p class="mt-2 text-text-secondary">{{ t('auth.login.subtitle') }}</p>
      </div>

      <!-- Login Form -->
      <div v-if="!showTotp" class="bg-bg-primary rounded-xl shadow-sm border border-border p-8">
        <LoginForm ref="loginFormRef" @totp-required="handleTotpRequired" />

        <!-- 临时演示账号 -->
        <div class="mt-6 pt-6 border-t border-border">
          <p class="text-xs text-text-tertiary mb-3 text-center">开发环境快速登录</p>
          <div class="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              @click="fillDemoCredentials('admin')"
            >
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              管理员账号
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              @click="fillDemoCredentials('user')"
            >
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              普通用户
            </Button>
          </div>
          <p class="mt-2 text-xs text-text-tertiary text-center">
            管理员: admin@example.com / admin123456
          </p>
        </div>

        <div class="mt-6 flex items-center justify-between text-sm">
          <button
            class="text-primary-600 hover:text-primary-700 font-medium"
            @click="goToForgotPassword"
          >
            {{ t('auth.login.forgotPassword') }}
          </button>
        </div>

        <div class="mt-6 pt-6 border-t border-border text-center text-sm">
          <span class="text-text-secondary">{{ t('auth.login.noAccount') }}</span>
          <button
            class="ml-1 text-primary-600 hover:text-primary-700 font-medium"
            @click="goToRegister"
          >
            {{ t('auth.login.register') }}
          </button>
        </div>
      </div>

      <!-- TOTP Form -->
      <div v-else class="bg-bg-primary rounded-xl shadow-sm border border-border p-8">
        <h2 class="text-xl font-semibold text-text-primary mb-2">
          {{ t('auth.totp.title') }}
        </h2>
        <p class="text-text-secondary mb-6">{{ t('auth.totp.subtitle') }}</p>

        <!-- TOTP input would go here -->
        <div class="space-y-4">
          <input
            type="text"
            maxlength="6"
            placeholder="000000"
            class="w-full px-3 py-2 text-center text-2xl tracking-widest bg-bg-primary border rounded-lg"
          />
          <Button variant="primary" block>
            {{ t('auth.totp.submit') }}
          </Button>
        </div>

        <button
          class="mt-4 w-full text-center text-sm text-text-secondary hover:text-text-primary"
          @click="showTotp = false"
        >
          {{ t('common.back') }}
        </button>
      </div>
    </div>
  </div>
</template>
