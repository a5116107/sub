<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Button } from '~/shared/ui'
import { ROUTES } from '~/shared/config/constants'

const { t } = useI18n()
const router = useRouter()

function goToLogin() {
  router.push(ROUTES.LOGIN)
}

function goToRegister() {
  router.push(ROUTES.REGISTER)
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="bg-bg-primary border-b border-border">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center gap-2">
            <span class="text-2xl font-bold text-primary-600">Sub2API</span>
          </div>
          <div class="flex items-center gap-4">
            <Button variant="ghost" @click="goToLogin">
              {{ t('auth.login.submit') }}
            </Button>
            <Button variant="primary" @click="goToRegister">
              {{ t('auth.register.submit') }}
            </Button>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <main class="flex-1">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div class="text-center">
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary mb-6">
            Sub2API
          </h1>
          <p class="text-xl text-text-secondary max-w-2xl mx-auto mb-10">
            A powerful API gateway for AI models. Manage your API keys, track usage, and access multiple AI providers through a single interface.
          </p>
          <div class="flex justify-center gap-4">
            <Button variant="primary" size="lg" @click="goToRegister">
              Get Started
            </Button>
            <Button variant="secondary" size="lg" @click="() => router.push(ROUTES.DOCS)">
              Documentation
            </Button>
          </div>
        </div>

        <!-- Features -->
        <div class="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="p-6 bg-bg-primary rounded-xl border border-border">
            <div class="text-3xl mb-4">🔑</div>
            <h3 class="text-lg font-semibold text-text-primary mb-2">API Key Management</h3>
            <p class="text-text-secondary">Create and manage multiple API keys with customizable permissions and limits.</p>
          </div>
          <div class="p-6 bg-bg-primary rounded-xl border border-border">
            <div class="text-3xl mb-4">📊</div>
            <h3 class="text-lg font-semibold text-text-primary mb-2">Usage Analytics</h3>
            <p class="text-text-secondary">Track your API usage with detailed statistics and visualizations.</p>
          </div>
          <div class="p-6 bg-bg-primary rounded-xl border border-border">
            <div class="text-3xl mb-4">🤖</div>
            <h3 class="text-lg font-semibold text-text-primary mb-2">Multi-Provider Support</h3>
            <p class="text-text-secondary">Access Anthropic, OpenAI, Gemini, and more through a unified API.</p>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-bg-secondary border-t border-border py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-text-tertiary">
        <p>&copy; 2024 Sub2API. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>
