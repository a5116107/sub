<template>
  <div class="min-h-screen">
    <!-- Background Decoration -->
    <div class="pointer-events-none fixed inset-0 bg-mesh-gradient opacity-55 dark:opacity-35"></div>
    <div
      class="pointer-events-none fixed inset-0 opacity-40 dark:opacity-15"
      style="
        background-image:
          linear-gradient(rgba(34, 211, 238, 0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(34, 211, 238, 0.06) 1px, transparent 1px);
        background-size: 72px 72px;
      "
    ></div>
    <div
      class="pointer-events-none fixed inset-0 opacity-[0.22] dark:opacity-[0.10]"
      style="background-image: repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0, rgba(255, 255, 255, 0.06) 1px, transparent 3px, transparent 10px)"
    ></div>

    <!-- Sidebar -->
    <AppSidebar />

    <!-- Main Content Area -->
    <div
      class="relative min-h-screen transition-all duration-300"
      :class="[sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64']"
    >
      <!-- Header (fixed: avoids sticky/backdrop quirks; stays aligned with sidebar) -->
      <div
        class="fixed top-0 right-0 z-30 transition-all duration-300"
        :class="[sidebarCollapsed ? 'lg:left-[72px]' : 'lg:left-64', 'left-0']"
      >
        <AppHeader />
      </div>

      <!-- Main Content -->
      <main class="p-4 pt-20 md:p-6 md:pt-24 lg:p-8 lg:pt-24">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import '@/styles/onboarding.css'
import { computed, onMounted } from 'vue'
import { useAppStore } from '@/stores'
import { useAuthStore } from '@/stores/auth'
import { useOnboardingTour } from '@/composables/useOnboardingTour'
import { useOnboardingStore } from '@/stores/onboarding'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'

const appStore = useAppStore()
const authStore = useAuthStore()
const sidebarCollapsed = computed(() => appStore.sidebarCollapsed)
const isAdmin = computed(() => authStore.user?.role === 'admin')

const { replayTour } = useOnboardingTour({
  storageKey: isAdmin.value ? 'admin_guide' : 'user_guide',
  autoStart: true
})

const onboardingStore = useOnboardingStore()

onMounted(() => {
  onboardingStore.setReplayCallback(replayTour)
})

defineExpose({ replayTour })
</script>
