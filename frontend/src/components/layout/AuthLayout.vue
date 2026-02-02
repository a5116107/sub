<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
    <!-- Background -->
    <div
      class="absolute inset-0 bg-gradient-to-br from-gray-50 via-primary-50/30 to-gray-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950"
    ></div>

    <!-- Decorative Elements -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <!-- Gradient Orbs -->
      <div
        class="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-primary-400/20 blur-3xl"
      ></div>
      <div
        class="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary-500/15 blur-3xl"
      ></div>
      <div
        class="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-300/10 blur-3xl"
      ></div>

      <!-- Grid Pattern -->
      <div
        class="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:64px_64px]"
      ></div>
    </div>

    <!-- Content Container -->
    <div class="relative z-10 w-full max-w-md">
      <!-- Logo/Brand -->
      <div class="mb-8 text-center">
        <!-- Custom Logo or Default Logo with glow effect -->
        <div class="logo-container relative mb-4 inline-block">
          <!-- Glow background -->
          <div class="logo-glow absolute inset-0 rounded-2xl bg-primary-400/30 blur-xl"></div>
          <div
            class="relative inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white dark:bg-dark-800 shadow-lg shadow-primary-500/30 ring-1 ring-primary-200/50 dark:ring-primary-700/30"
          >
            <img :src="siteLogo || '/logo.png'" alt="Logo" class="h-full w-full object-contain" />
          </div>
        </div>
        <h1 class="text-gradient mb-2 text-3xl font-bold">
          {{ siteName }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-dark-400">
          {{ siteSubtitle }}
        </p>
      </div>

      <!-- Card Container -->
      <div class="card-glass rounded-2xl p-8 shadow-glass">
        <slot />
      </div>

      <!-- Footer Links -->
      <div class="mt-6 text-center text-sm">
        <slot name="footer" />
      </div>

      <!-- Copyright -->
      <div class="mt-8 text-center text-xs text-gray-400 dark:text-dark-500">
        &copy; {{ currentYear }} {{ siteName }}. All rights reserved.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getPublicSettings } from '@/api/auth'
import { sanitizeUrl } from '@/utils/url'

const siteName = ref('Sub2API')
const siteLogo = ref('')
const siteSubtitle = ref('Subscription to API Conversion Platform')

const currentYear = computed(() => new Date().getFullYear())

onMounted(async () => {
  try {
    const settings = await getPublicSettings()
    siteName.value = settings.site_name || 'Sub2API'
    siteLogo.value = sanitizeUrl(settings.site_logo || '', { allowRelative: true })
    siteSubtitle.value = settings.site_subtitle || 'Subscription to API Conversion Platform'
  } catch (error) {
    console.error('Failed to load public settings:', error)
  }
})
</script>

<style scoped>
.text-gradient {
  @apply bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent;
}

/* Logo glow animation */
.logo-glow {
  animation: logoGlow 3s ease-in-out infinite alternate;
}

@keyframes logoGlow {
  0% {
    opacity: 0.3;
    transform: scale(1);
  }
  100% {
    opacity: 0.5;
    transform: scale(1.1);
  }
}

/* Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  .logo-glow {
    animation: none;
    opacity: 0.4;
  }
}
</style>
