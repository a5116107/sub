<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useAppStore } from '~/app/stores'
import { ROUTES } from '~/shared/config/constants'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

const sidebarCollapsed = computed(() => appStore.sidebarCollapsed)

const navigation = computed(() => [
  { name: t('nav.dashboard'), path: ROUTES.DASHBOARD, icon: '📊' },
  { name: t('nav.apiKeys'), path: ROUTES.API_KEYS, icon: '🔑' },
  { name: t('nav.usage'), path: ROUTES.USAGE, icon: '📈' },
  { name: t('nav.profile'), path: ROUTES.PROFILE, icon: '👤' }
])

const adminNavigation = computed(() => [
  { name: t('admin.dashboard.title'), path: ROUTES.ADMIN.DASHBOARD, icon: '📊' },
  { name: t('admin.users.title'), path: ROUTES.ADMIN.USERS, icon: '👥' },
  { name: t('admin.groups.title'), path: ROUTES.ADMIN.GROUPS, icon: '📁' },
  { name: t('admin.accounts.title'), path: ROUTES.ADMIN.ACCOUNTS, icon: '🔐' },
  { name: t('admin.ops.title'), path: ROUTES.ADMIN.OPS, icon: '🔧' },
  { name: t('admin.settings.title'), path: ROUTES.ADMIN.SETTINGS, icon: '⚙️' }
])

const isAdmin = computed(() => authStore.isAdmin)

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(path + '/')
}

function navigate(path: string) {
  router.push(path)
}

function toggleSidebar() {
  appStore.toggleSidebar()
}

function logout() {
  authStore.logout()
  router.push(ROUTES.LOGIN)
}
</script>

<template>
  <div class="min-h-screen flex bg-bg-secondary">
    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 bg-bg-primary border-r border-border transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      ]"
    >
      <!-- Logo -->
      <div class="h-16 flex items-center justify-center border-b border-border">
        <span v-if="!sidebarCollapsed" class="text-xl font-bold text-primary-600">Sub2API</span>
        <span v-else class="text-xl font-bold text-primary-600">S2</span>
      </div>

      <!-- Navigation -->
      <nav class="p-2 space-y-1">
        <button
          v-for="item in navigation"
          :key="item.path"
          :class="[
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-base',
            isActive(item.path)
              ? 'bg-primary-50 text-primary-700'
              : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
          ]"
          @click="navigate(item.path)"
        >
          <span class="text-lg">{{ item.icon }}</span>
          <span v-if="!sidebarCollapsed">{{ item.name }}</span>
        </button>

        <!-- Admin Section -->
        <template v-if="isAdmin">
          <div v-if="!sidebarCollapsed" class="pt-4 pb-2">
            <p class="px-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              {{ t('nav.admin') }}
            </p>
          </div>
          <div v-else class="pt-4 pb-2 flex justify-center">
            <div class="w-8 h-px bg-border"></div>
          </div>

          <button
            v-for="item in adminNavigation"
            :key="item.path"
            :class="[
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-base',
              isActive(item.path)
                ? 'bg-primary-50 text-primary-700'
                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
            ]"
            @click="navigate(item.path)"
          >
            <span class="text-lg">{{ item.icon }}</span>
            <span v-if="!sidebarCollapsed">{{ item.name }}</span>
          </button>
        </template>
      </nav>

      <!-- Bottom Actions -->
      <div class="absolute bottom-0 left-0 right-0 p-2 border-t border-border">
        <button
          class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-base"
          @click="logout"
        >
          <span class="text-lg">🚪</span>
          <span v-if="!sidebarCollapsed">{{ t('nav.logout') }}</span>
        </button>

        <button
          class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-base"
          @click="toggleSidebar"
        >
          <span class="text-lg">{{ sidebarCollapsed ? '→' : '←' }}</span>
          <span v-if="!sidebarCollapsed">{{ sidebarCollapsed ? 'Expand' : 'Collapse' }}</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main
      :class="[
        'flex-1 transition-all duration-300',
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      ]"
    >
      <!-- Header -->
      <header class="h-16 bg-bg-primary border-b border-border flex items-center justify-between px-6">
        <h1 class="text-lg font-semibold text-text-primary">
          {{ route.meta.title || 'Sub2API' }}
        </h1>

        <div class="flex items-center gap-4">
          <!-- User Info -->
          <div class="flex items-center gap-2 text-sm text-text-secondary">
            <span class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
              {{ authStore.user?.username?.charAt(0).toUpperCase() || 'U' }}
            </span>
            <span v-if="!sidebarCollapsed">{{ authStore.user?.username || authStore.user?.email }}</span>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <div class="p-6">
        <router-view />
      </div>
    </main>
  </div>
</template>
