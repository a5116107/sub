<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[100] overflow-y-auto bg-black/50 backdrop-blur-sm"
        @click.self="close"
      >
        <div class="flex min-h-full items-start justify-center p-4 pt-[15vh]">
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 scale-95 -translate-y-4"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 -translate-y-4"
          >
            <div
              v-if="isOpen"
              class="w-full max-w-xl overflow-hidden rounded-2xl bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:bg-dark-900/95 dark:ring-white/10"
            >
              <!-- Search Input -->
              <div class="relative border-b border-gray-200 dark:border-dark-700">
                <Icon
                  name="search"
                  size="md"
                  class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  ref="inputRef"
                  v-model="query"
                  type="text"
                  :placeholder="t('commandPalette.placeholder')"
                  class="w-full border-0 bg-transparent py-4 pl-12 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 dark:text-white dark:placeholder-gray-500"
                  @keydown.down.prevent="selectNext"
                  @keydown.up.prevent="selectPrev"
                  @keydown.enter.prevent="executeSelected"
                  @keydown.escape="close"
                />
                <div class="absolute right-4 top-1/2 -translate-y-1/2">
                  <kbd class="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:bg-dark-700 dark:text-gray-400">
                    ESC
                  </kbd>
                </div>
              </div>

              <!-- Results -->
              <div class="max-h-[400px] overflow-y-auto p-2">
                <!-- Recent Section -->
                <div v-if="!query && recentItems.length > 0" class="mb-2">
                  <div class="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {{ t('commandPalette.recent') }}
                  </div>
                  <div class="space-y-1">
                    <button
                      v-for="(item, index) in recentItems"
                      :key="`recent-${item.id}`"
                      :class="[
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                        selectedIndex === index
                          ? 'bg-primary-50 text-primary-900 dark:bg-primary-900/20 dark:text-primary-100'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-800'
                      ]"
                      @click="executeItem(item)"
                      @mouseenter="selectedIndex = index"
                    >
                      <div :class="['flex h-8 w-8 items-center justify-center rounded-lg', getIconBg(item.type)]">
                        <Icon :name="item.icon" size="sm" :class="getIconColor(item.type)" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-medium truncate">{{ item.title }}</div>
                        <div v-if="item.subtitle" class="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {{ item.subtitle }}
                        </div>
                      </div>
                      <Icon v-if="item.type === 'page'" name="chevronRight" size="sm" class="text-gray-400" />
                    </button>
                  </div>
                </div>

                <!-- Search Results -->
                <template v-if="query">
                  <!-- Pages Section -->
                  <div v-if="filteredPages.length > 0" class="mb-2">
                    <div class="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {{ t('commandPalette.pages') }}
                    </div>
                    <div class="space-y-1">
                      <button
                        v-for="(item, index) in filteredPages"
                        :key="`page-${item.id}`"
                        :class="[
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                          selectedIndex === getGlobalIndex('pages', index)
                            ? 'bg-primary-50 text-primary-900 dark:bg-primary-900/20 dark:text-primary-100'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-800'
                        ]"
                        @click="executeItem(item)"
                        @mouseenter="selectedIndex = getGlobalIndex('pages', index)"
                      >
                        <div :class="['flex h-8 w-8 items-center justify-center rounded-lg', getIconBg(item.type)]">
                          <Icon :name="item.icon" size="sm" :class="getIconColor(item.type)" />
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="font-medium truncate" v-html="highlightMatch(item.title)"></div>
                          <div v-if="item.subtitle" class="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {{ item.subtitle }}
                          </div>
                        </div>
                        <Icon name="chevronRight" size="sm" class="text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <!-- Actions Section -->
                  <div v-if="filteredActions.length > 0" class="mb-2">
                    <div class="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {{ t('commandPalette.actions') }}
                    </div>
                    <div class="space-y-1">
                      <button
                        v-for="(item, index) in filteredActions"
                        :key="`action-${item.id}`"
                        :class="[
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                          selectedIndex === getGlobalIndex('actions', index)
                            ? 'bg-primary-50 text-primary-900 dark:bg-primary-900/20 dark:text-primary-100'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-800'
                        ]"
                        @click="executeItem(item)"
                        @mouseenter="selectedIndex = getGlobalIndex('actions', index)"
                      >
                        <div :class="['flex h-8 w-8 items-center justify-center rounded-lg', getIconBg(item.type)]">
                          <Icon :name="item.icon" size="sm" :class="getIconColor(item.type)" />
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="font-medium truncate" v-html="highlightMatch(item.title)"></div>
                          <div v-if="item.subtitle" class="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {{ item.subtitle }}
                          </div>
                        </div>
                        <kbd v-if="item.shortcut" class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-dark-700 dark:text-gray-400">
                          {{ item.shortcut }}
                        </kbd>
                      </button>
                    </div>
                  </div>
                </template>

                <!-- No Results -->
                <div
                  v-if="query && filteredPages.length === 0 && filteredActions.length === 0"
                  class="py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  <Icon name="search" size="lg" class="mx-auto mb-2 opacity-50" />
                  <p>{{ t('commandPalette.noResults') }}</p>
                </div>

                <!-- Quick Tips (when empty) -->
                <div v-if="!query && recentItems.length === 0" class="py-8 text-center text-gray-500 dark:text-gray-400">
                  <Icon name="terminal" size="lg" class="mx-auto mb-2 opacity-50" />
                  <p class="mb-2">{{ t('commandPalette.tips.title') }}</p>
                  <p class="text-xs">{{ t('commandPalette.tips.hint') }}</p>
                </div>
              </div>

              <!-- Footer -->
              <div class="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-500 dark:border-dark-700 dark:text-gray-400">
                <div class="flex items-center gap-4">
                  <span class="flex items-center gap-1">
                    <kbd class="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-dark-700">↑↓</kbd>
                    {{ t('commandPalette.navigate') }}
                  </span>
                  <span class="flex items-center gap-1">
                    <kbd class="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-dark-700">↵</kbd>
                    {{ t('commandPalette.select') }}
                  </span>
                </div>
                <span class="flex items-center gap-1">
                  <kbd class="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-dark-700">⌘K</kbd>
                  {{ t('commandPalette.toggle') }}
                </span>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import Icon, { type IconName } from '@/components/icons/Icon.vue'

interface CommandItem {
  id: string
  title: string
  subtitle?: string
  icon: IconName
  type: 'page' | 'action' | 'user' | 'key'
  action?: () => void
  route?: string
  shortcut?: string
  keywords?: string[]
}

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()

const isOpen = ref(false)
const query = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
const recentItems = ref<CommandItem[]>([])

const isAdmin = computed(() => authStore.user?.role === 'admin')

// Define available pages
const pages = computed<CommandItem[]>(() => {
  const userPages: CommandItem[] = [
    { id: 'dashboard', title: t('nav.dashboard'), icon: 'home', type: 'page', route: '/dashboard', keywords: ['home', '首页', '仪表盘'] },
    { id: 'keys', title: t('nav.apiKeys'), icon: 'key', type: 'page', route: '/keys', keywords: ['api', 'key', '密钥'] },
    { id: 'usage', title: t('nav.usage'), icon: 'chart', type: 'page', route: '/usage', keywords: ['usage', '用量', '统计'] },
    { id: 'subscriptions', title: t('nav.subscriptions'), icon: 'creditCard', type: 'page', route: '/subscriptions', keywords: ['subscription', '订阅'] },
    { id: 'redeem', title: t('nav.redeem'), icon: 'gift', type: 'page', route: '/redeem', keywords: ['redeem', '兑换', '充值'] },
    { id: 'profile', title: t('nav.profile'), icon: 'user', type: 'page', route: '/profile', keywords: ['profile', '个人', '设置'] }
  ]

  const adminPages: CommandItem[] = [
    { id: 'admin-dashboard', title: t('nav.adminDashboard'), icon: 'chart', type: 'page', route: '/admin/dashboard', keywords: ['admin', '管理', '仪表盘'] },
    { id: 'admin-users', title: t('nav.users'), icon: 'users', type: 'page', route: '/admin/users', keywords: ['users', '用户', '管理'] },
    { id: 'admin-accounts', title: t('nav.accounts'), icon: 'server', type: 'page', route: '/admin/accounts', keywords: ['accounts', '账号', '服务'] },
    { id: 'admin-groups', title: t('nav.groups'), icon: 'grid', type: 'page', route: '/admin/groups', keywords: ['groups', '分组'] },
    { id: 'admin-keys', title: t('nav.adminKeys'), icon: 'key', type: 'page', route: '/admin/keys', keywords: ['keys', '密钥', '管理'] },
    { id: 'admin-redeem', title: t('nav.adminRedeem'), icon: 'gift', type: 'page', route: '/admin/redeem', keywords: ['redeem', '兑换码'] },
    { id: 'admin-subscriptions', title: t('nav.adminSubscriptions'), icon: 'creditCard', type: 'page', route: '/admin/subscriptions', keywords: ['subscriptions', '订阅'] },
    { id: 'admin-settings', title: t('nav.settings'), icon: 'cog', type: 'page', route: '/admin/settings', keywords: ['settings', '设置', '配置'] }
  ]

  return isAdmin.value ? [...userPages, ...adminPages] : userPages
})

// Define available actions
const actions = computed<CommandItem[]>(() => {
  const commonActions: CommandItem[] = [
    { id: 'create-key', title: t('keys.createKey'), icon: 'plus', type: 'action', route: '/keys', shortcut: 'N', keywords: ['create', 'new', '创建', '新建'] },
    { id: 'toggle-theme', title: t('commandPalette.toggleTheme'), icon: 'moon', type: 'action', action: toggleTheme, keywords: ['theme', 'dark', 'light', '主题', '暗色', '亮色'] },
    { id: 'logout', title: t('nav.logout'), icon: 'login', type: 'action', action: logout, keywords: ['logout', 'signout', '退出', '登出'] }
  ]

  return commonActions
})

// Filter pages based on query
const filteredPages = computed(() => {
  if (!query.value) return []
  const q = query.value.toLowerCase()
  return pages.value.filter(page => {
    const titleMatch = page.title.toLowerCase().includes(q)
    const keywordMatch = page.keywords?.some(k => k.toLowerCase().includes(q))
    return titleMatch || keywordMatch
  }).slice(0, 5)
})

// Filter actions based on query
const filteredActions = computed(() => {
  if (!query.value) return []
  const q = query.value.toLowerCase()
  return actions.value.filter(action => {
    const titleMatch = action.title.toLowerCase().includes(q)
    const keywordMatch = action.keywords?.some(k => k.toLowerCase().includes(q))
    return titleMatch || keywordMatch
  }).slice(0, 5)
})

// Get all filtered items for navigation
const allFilteredItems = computed(() => {
  if (!query.value) return recentItems.value
  return [...filteredPages.value, ...filteredActions.value]
})

// Get global index for an item in a section
const getGlobalIndex = (section: 'pages' | 'actions', localIndex: number): number => {
  if (section === 'pages') return localIndex
  return filteredPages.value.length + localIndex
}

// Highlight matching text
const highlightMatch = (text: string): string => {
  if (!query.value) return text
  const regex = new RegExp(`(${query.value})`, 'gi')
  return text.replace(regex, '<mark class="bg-primary-200 dark:bg-primary-800 rounded px-0.5">$1</mark>')
}

// Get icon background color
const getIconBg = (type: string): string => {
  const bgs: Record<string, string> = {
    page: 'bg-blue-100 dark:bg-blue-900/30',
    action: 'bg-purple-100 dark:bg-purple-900/30',
    user: 'bg-green-100 dark:bg-green-900/30',
    key: 'bg-amber-100 dark:bg-amber-900/30'
  }
  return bgs[type] || bgs.page
}

// Get icon color
const getIconColor = (type: string): string => {
  const colors: Record<string, string> = {
    page: 'text-blue-600 dark:text-blue-400',
    action: 'text-purple-600 dark:text-purple-400',
    user: 'text-green-600 dark:text-green-400',
    key: 'text-amber-600 dark:text-amber-400'
  }
  return colors[type] || colors.page
}

// Navigation
const selectNext = () => {
  const maxIndex = allFilteredItems.value.length - 1
  selectedIndex.value = Math.min(selectedIndex.value + 1, maxIndex)
}

const selectPrev = () => {
  selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
}

// Execute selected item
const executeSelected = () => {
  const item = allFilteredItems.value[selectedIndex.value]
  if (item) {
    executeItem(item)
  }
}

// Execute an item
const executeItem = (item: CommandItem) => {
  // Add to recent
  addToRecent(item)

  if (item.action) {
    item.action()
  } else if (item.route) {
    router.push(item.route)
  }

  close()
}

// Add item to recent
const addToRecent = (item: CommandItem) => {
  const filtered = recentItems.value.filter(r => r.id !== item.id)
  recentItems.value = [item, ...filtered].slice(0, 5)
  localStorage.setItem('commandPalette:recent', JSON.stringify(recentItems.value))
}

// Load recent items
const loadRecent = () => {
  try {
    const stored = localStorage.getItem('commandPalette:recent')
    if (stored) {
      recentItems.value = JSON.parse(stored)
    }
  } catch {
    recentItems.value = []
  }
}

// Actions
const toggleTheme = () => {
  document.documentElement.classList.toggle('dark')
  const isDark = document.documentElement.classList.contains('dark')
  localStorage.setItem('theme', isDark ? 'dark' : 'light')
}

const logout = async () => {
  try {
    await authStore.logout()
  } catch (error) {
    console.error('Logout error:', error)
  }
  await router.push('/login')
}

// Open/Close
const open = () => {
  isOpen.value = true
  query.value = ''
  selectedIndex.value = 0
  nextTick(() => {
    inputRef.value?.focus()
  })
}

const close = () => {
  isOpen.value = false
}

const toggle = () => {
  if (isOpen.value) {
    close()
  } else {
    open()
  }
}

// Reset selection when query changes
watch(query, () => {
  selectedIndex.value = 0
})

// Keyboard shortcut handler
const handleKeydown = (e: KeyboardEvent) => {
  // Cmd/Ctrl + K to toggle
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    toggle()
  }
}

onMounted(() => {
  loadRecent()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// Expose methods
defineExpose({
  open,
  close,
  toggle
})
</script>
