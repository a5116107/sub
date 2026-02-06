<template>
  <div class="card p-6">
    <!-- Toolbar: left filters (multi-line) + right actions -->
    <div class="flex flex-wrap items-end justify-between gap-4">
      <!-- Left: filters (allowed to wrap to multiple rows) -->
      <div class="flex flex-1 flex-wrap items-end gap-4">
        <!-- Date Range Filter -->
        <div class="w-full sm:w-auto [&_.date-picker-trigger]:w-full">
          <label class="input-label">{{ t('usage.timeRange') }}</label>
          <DateRangePicker
            :start-date="startDate"
            :end-date="endDate"
            @update:startDate="updateStartDate"
            @update:endDate="updateEndDate"
            @change="onDateRangePickerChange"
          />
        </div>

        <!-- User Search -->
        <div ref="userSearchRef" class="usage-filter-dropdown relative w-full sm:w-auto sm:min-w-[240px]">
          <label class="input-label">{{ t('admin.usage.userFilter') }}</label>
          <input
            v-model="userKeyword"
            type="text"
            class="input pr-8"
            :placeholder="t('admin.usage.searchUserPlaceholder')"
            @input="debounceUserSearch"
            @focus="showUserDropdown = true"
          />
          <button
            v-if="filters.user_id"
            type="button"
            @click="clearUser"
            class="absolute right-2 top-9 flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:text-dark-400 dark:hover:text-dark-200"
            aria-label="Clear user filter"
          >
            <Icon name="x" size="sm" />
          </button>
          <div
            v-if="showUserDropdown && (userResults.length > 0 || userKeyword)"
            class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-white shadow-lg dark:bg-gray-800"
          >
            <button
              v-for="u in userResults"
              :key="u.id"
              type="button"
              @click="selectUser(u)"
              class="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <span>{{ u.email }}</span>
              <span class="ml-2 text-xs text-gray-400">#{{ u.id }}</span>
            </button>
          </div>
        </div>

        <!-- API Key Search -->
        <div ref="apiKeySearchRef" class="usage-filter-dropdown relative w-full sm:w-auto sm:min-w-[240px]">
          <label class="input-label">{{ t('usage.apiKeyFilter') }}</label>
          <input
            v-model="apiKeyKeyword"
            type="text"
            class="input pr-8"
            :placeholder="t('admin.usage.searchApiKeyPlaceholder')"
            @input="debounceApiKeySearch"
            @focus="onApiKeyFocus"
          />
          <button
            v-if="filters.api_key_id"
            type="button"
            @click="onClearApiKey"
            class="absolute right-2 top-9 flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:text-dark-400 dark:hover:text-dark-200"
            aria-label="Clear API key filter"
          >
            <Icon name="x" size="sm" />
          </button>
          <div
            v-if="showApiKeyDropdown && apiKeyResults.length > 0"
            class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-white shadow-lg dark:bg-gray-800"
          >
            <button
              v-for="k in apiKeyResults"
              :key="k.id"
              type="button"
              @click="selectApiKey(k)"
              class="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <span class="truncate">{{ k.name || `#${k.id}` }}</span>
              <span class="ml-2 text-xs text-gray-400">#{{ k.id }}</span>
            </button>
          </div>
        </div>

        <!-- Model Filter -->
        <div class="w-full sm:w-auto sm:min-w-[220px]">
          <label class="input-label">{{ t('usage.model') }}</label>
          <Select v-model="filters.model" :options="modelOptions" searchable @change="emitChange" />
        </div>

        <!-- Account Filter -->
        <div ref="accountSearchRef" class="usage-filter-dropdown relative w-full sm:w-auto sm:min-w-[220px]">
          <label class="input-label">{{ t('admin.usage.account') }}</label>
          <input
            v-model="accountKeyword"
            type="text"
            class="input pr-8"
            :placeholder="t('admin.usage.searchAccountPlaceholder')"
            @input="debounceAccountSearch"
            @focus="showAccountDropdown = true"
          />
          <button
            v-if="filters.account_id"
            type="button"
            @click="clearAccount"
            class="absolute right-2 top-9 flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:text-dark-400 dark:hover:text-dark-200"
            aria-label="Clear account filter"
          >
            <Icon name="x" size="sm" />
          </button>
          <div
            v-if="showAccountDropdown && (accountResults.length > 0 || accountKeyword)"
            class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-white shadow-lg dark:bg-gray-800"
          >
            <button
              v-for="a in accountResults"
              :key="a.id"
              type="button"
              @click="selectAccount(a)"
              class="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <span class="truncate">{{ a.name }}</span>
              <span class="ml-2 text-xs text-gray-400">#{{ a.id }}</span>
            </button>
          </div>
        </div>

        <!-- Presets -->
        <div ref="presetDropdownRef" class="relative w-full sm:w-auto">
          <button
            type="button"
            class="btn btn-secondary btn-sm px-2 sm:px-3"
            :title="t('admin.usage.presets.title')"
            :aria-label="t('admin.usage.presets.title')"
            :aria-expanded="showPresetsDropdown"
            @click="togglePresetsDropdown"
          >
            <Icon name="clock" size="sm" class="sm:mr-1" />
            <span class="hidden sm:inline">{{ t('admin.usage.presets.title') }}</span>
          </button>

          <div
            v-if="showPresetsDropdown"
            class="absolute z-50 mt-2 w-[min(520px,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-dark-700 dark:bg-dark-800"
            @click.stop
          >
            <div class="flex flex-wrap items-end gap-2">
              <div class="min-w-[220px] flex-1">
                <Input v-model="presetName" :placeholder="t('admin.usage.presets.namePlaceholder')" />
              </div>
              <button type="button" class="btn btn-primary btn-sm whitespace-nowrap" @click="saveCurrentToFavorites">
                {{ t('admin.usage.presets.save') }}
              </button>
            </div>

            <div class="mt-3 space-y-3">
              <div>
                <div class="mb-1 text-xs font-semibold text-gray-500 dark:text-dark-400">
                  {{ t('admin.usage.presets.recent') }}
                </div>
                <div v-if="recentPresets.length === 0" class="text-xs text-gray-400 dark:text-dark-500">
                  {{ t('admin.usage.presets.emptyRecent') }}
                </div>
                <div v-else class="space-y-1">
                  <button
                    v-for="p in recentPresets"
                    :key="p.id"
                    type="button"
                    class="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-dark-700"
                    @click="applyPreset(p)"
                  >
                    <div class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {{ p.name }}
                    </div>
                    <div class="mt-0.5 text-xs text-gray-500 dark:text-dark-400">
                      {{ p.subtitle }}
                    </div>
                  </button>
                </div>
              </div>

              <div class="border-t border-gray-100 pt-3 dark:border-dark-700">
                <div class="mb-1 text-xs font-semibold text-gray-500 dark:text-dark-400">
                  {{ t('admin.usage.presets.favorites') }}
                </div>
                <div v-if="favoritePresets.length === 0" class="text-xs text-gray-400 dark:text-dark-500">
                  {{ t('admin.usage.presets.emptyFavorites') }}
                </div>
                <div v-else class="space-y-1">
                  <div v-for="p in favoritePresets" :key="p.id" class="flex items-center gap-2">
                    <button
                      type="button"
                      class="flex-1 rounded-lg px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-dark-700"
                      @click="applyPreset(p)"
                    >
                      <div class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                        {{ p.name }}
                      </div>
                      <div class="mt-0.5 text-xs text-gray-500 dark:text-dark-400">
                        {{ p.subtitle }}
                      </div>
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm px-2"
                      :aria-label="t('common.delete')"
                      @click.stop="deleteFavorite(p.id)"
                    >
                      <Icon name="trash" size="sm" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="w-full sm:w-auto">
          <button
            type="button"
            class="btn btn-secondary btn-sm px-2 sm:px-3"
            :title="showAdvanced ? t('admin.usage.filters.less') : t('admin.usage.filters.more')"
            :aria-label="showAdvanced ? t('admin.usage.filters.less') : t('admin.usage.filters.more')"
            @click="toggleAdvanced"
          >
            <Icon
              name="chevronDown"
              size="sm"
              class="transition-transform sm:mr-1"
              :class="showAdvanced ? 'rotate-180' : ''"
            />
            <span class="hidden sm:inline">{{ showAdvanced ? t('admin.usage.filters.less') : t('admin.usage.filters.more') }}</span>
            <span
              v-if="advancedActiveCount > 0"
              class="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-dark-700 dark:text-dark-200"
            >
              {{ advancedActiveCount }}
            </span>
          </button>
        </div>

        <div v-if="showAdvanced" class="w-full border-t border-gray-100 pt-4 dark:border-dark-700">
          <div class="flex flex-wrap items-end gap-4">
            <!-- Stream Type Filter -->
            <div class="w-full sm:w-auto sm:min-w-[180px]">
              <label class="input-label">{{ t('usage.type') }}</label>
              <Select v-model="filters.stream" :options="streamTypeOptions" @change="emitChange" />
            </div>

            <!-- Billing Type Filter -->
            <div class="w-full sm:w-auto sm:min-w-[200px]">
              <label class="input-label">{{ t('admin.usage.billingType') }}</label>
              <Select v-model="filters.billing_type" :options="billingTypeOptions" @change="emitChange" />
            </div>

            <!-- Group Filter -->
            <div class="w-full sm:w-auto sm:min-w-[200px]">
              <label class="input-label">{{ t('admin.usage.group') }}</label>
              <Select v-model="filters.group_id" :options="groupOptions" searchable @change="emitChange" />
            </div>
          </div>
        </div>
      </div>

      <!-- Right: actions -->
      <div v-if="showActions" class="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
        <button type="button" @click="$emit('reset')" class="btn btn-secondary">
          {{ t('common.reset') }}
        </button>
        <button type="button" @click="$emit('cleanup')" class="btn btn-danger">
          {{ t('admin.usage.cleanup.button') }}
        </button>
        <button type="button" @click="$emit('export')" :disabled="exporting" class="btn btn-primary">
          {{ t('usage.exportExcel') }}
        </button>
      </div>
    </div>

    <div v-if="filterChips.length > 0" class="mt-4 flex flex-wrap items-center gap-2">
      <button
        v-for="chip in filterChips"
        :key="chip.key"
        type="button"
        class="inline-flex max-w-full items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-dark-700 dark:bg-dark-900 dark:text-gray-200 dark:hover:bg-dark-700"
        @click="chip.onClear"
      >
        <span class="min-w-0 max-w-[18rem] truncate">{{ chip.label }}</span>
        <Icon name="x" size="xs" class="opacity-70" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { adminAPI } from '@/api/admin'
import Select, { type SelectOption } from '@/components/common/Select.vue'
import DateRangePicker from '@/components/common/DateRangePicker.vue'
import Input from '@/components/common/Input.vue'
import Icon from '@/components/icons/Icon.vue'
import type { SimpleApiKey, SimpleUser } from '@/api/admin/usage'

type ModelValue = Record<string, any>

interface Props {
  modelValue: ModelValue
  exporting: boolean
  startDate: string
  endDate: string
  showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showActions: true
})
const emit = defineEmits([
  'update:modelValue',
  'update:startDate',
  'update:endDate',
  'change',
  'reset',
  'export',
  'cleanup'
])

const { t } = useI18n()
const appStore = useAppStore()
const filters = toRef(props, 'modelValue')

const userSearchRef = ref<HTMLElement | null>(null)
const apiKeySearchRef = ref<HTMLElement | null>(null)
const accountSearchRef = ref<HTMLElement | null>(null)
const presetDropdownRef = ref<HTMLElement | null>(null)

const userKeyword = ref('')
const userResults = ref<SimpleUser[]>([])
const showUserDropdown = ref(false)
let userSearchTimeout: ReturnType<typeof setTimeout> | null = null

const apiKeyKeyword = ref('')
const apiKeyResults = ref<SimpleApiKey[]>([])
const showApiKeyDropdown = ref(false)
let apiKeySearchTimeout: ReturnType<typeof setTimeout> | null = null

interface SimpleAccount {
  id: number
  name: string
}
const accountKeyword = ref('')
const accountResults = ref<SimpleAccount[]>([])
const showAccountDropdown = ref(false)
let accountSearchTimeout: ReturnType<typeof setTimeout> | null = null

const modelOptions = ref<SelectOption[]>([{ value: null, label: t('admin.usage.allModels') }])
const groupOptions = ref<SelectOption[]>([{ value: null, label: t('admin.usage.allGroups') }])

const streamTypeOptions = ref<SelectOption[]>([
  { value: null, label: t('admin.usage.allTypes') },
  { value: true, label: t('usage.stream') },
  { value: false, label: t('usage.sync') }
])

const billingTypeOptions = ref<SelectOption[]>([
  { value: null, label: t('admin.usage.allBillingTypes') },
  { value: 0, label: t('admin.usage.billingTypeBalance') },
  { value: 1, label: t('admin.usage.billingTypeSubscription') }
])

const emitChange = () => emit('change')

type AdminUsagePresetSnapshot = {
  startDate: string
  endDate: string
  filters: Partial<{
    user_id: number
    api_key_id: number
    account_id: number
    model: string
    group_id: number
    stream: boolean
    billing_type: number
  }>
  labels: Partial<{
    userEmail: string
    apiKeyName: string
    accountName: string
  }>
}

type AdminUsagePresetItem = {
  id: string
  name: string
  snapshot: AdminUsagePresetSnapshot
  createdAt: number
  updatedAt: number
}

const ADMIN_USAGE_PRESETS_STORAGE_KEY = 'admin-usage-filters-presets-v1'
const presetsState = ref<{ recent: AdminUsagePresetItem[]; favorites: AdminUsagePresetItem[] }>({
  recent: [],
  favorites: []
})

const showPresetsDropdown = ref(false)
const presetName = ref('')

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const defaultEndDate = computed(() => formatLocalDate(new Date()))
const defaultStartDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return formatLocalDate(d)
})

const getGroupLabel = (groupId: number) => {
  return groupOptions.value.find((o) => o.value === groupId)?.label || `#${groupId}`
}

const getBillingTypeLabel = (value: number) => {
  if (value === 0) return t('admin.usage.billingTypeBalance')
  if (value === 1) return t('admin.usage.billingTypeSubscription')
  return String(value)
}

const buildSnapshotKey = (snapshot: AdminUsagePresetSnapshot) => {
  const f = snapshot.filters || {}
  return JSON.stringify({
    startDate: snapshot.startDate,
    endDate: snapshot.endDate,
    user_id: f.user_id ?? null,
    api_key_id: f.api_key_id ?? null,
    account_id: f.account_id ?? null,
    model: f.model ?? null,
    group_id: f.group_id ?? null,
    stream: typeof f.stream === 'boolean' ? f.stream : null,
    billing_type: typeof f.billing_type === 'number' ? f.billing_type : null
  })
}

const buildSnapshotName = (snapshot: AdminUsagePresetSnapshot) => {
  const labels = snapshot.labels || {}
  const f = snapshot.filters || {}

  if (labels.userEmail) return `${t('admin.usage.userFilter')}: ${labels.userEmail}`
  if (labels.apiKeyName) return `${t('usage.apiKeyFilter')}: ${labels.apiKeyName}`
  if (labels.accountName) return `${t('admin.usage.account')}: ${labels.accountName}`
  if (f.model) return `${t('usage.model')}: ${f.model}`
  if (typeof f.group_id === 'number') return `${t('admin.usage.group')}: ${getGroupLabel(f.group_id)}`
  if (typeof f.stream === 'boolean') return `${t('usage.type')}: ${f.stream ? t('usage.stream') : t('usage.sync')}`
  if (typeof f.billing_type === 'number') return `${t('admin.usage.billingType')}: ${getBillingTypeLabel(f.billing_type)}`
  return `${snapshot.startDate} ~ ${snapshot.endDate}`
}

const buildPresetSubtitle = (snapshot: AdminUsagePresetSnapshot) => `${snapshot.startDate} ~ ${snapshot.endDate}`

const recentPresets = computed(() =>
  presetsState.value.recent.map((p) => ({ ...p, subtitle: buildPresetSubtitle(p.snapshot) }))
)
const favoritePresets = computed(() =>
  presetsState.value.favorites.map((p) => ({ ...p, subtitle: buildPresetSubtitle(p.snapshot) }))
)

const persistPresetsToStorage = () => {
  try {
    localStorage.setItem(ADMIN_USAGE_PRESETS_STORAGE_KEY, JSON.stringify(presetsState.value))
  } catch (e) {
    console.error('Failed to persist usage filter presets:', e)
  }
}

const loadPresetsFromStorage = () => {
  try {
    const raw = localStorage.getItem(ADMIN_USAGE_PRESETS_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Partial<{
      recent: AdminUsagePresetItem[]
      favorites: AdminUsagePresetItem[]
    }>
    presetsState.value.recent = Array.isArray(parsed.recent) ? parsed.recent : []
    presetsState.value.favorites = Array.isArray(parsed.favorites) ? parsed.favorites : []
  } catch (e) {
    console.error('Failed to load usage filter presets:', e)
  }
}

const buildCurrentSnapshot = (): AdminUsagePresetSnapshot => {
  const snapshotFilters: AdminUsagePresetSnapshot['filters'] = {}
  const snapshotLabels: AdminUsagePresetSnapshot['labels'] = {}

  if (typeof filters.value.user_id === 'number') {
    snapshotFilters.user_id = filters.value.user_id
    if (userKeyword.value) snapshotLabels.userEmail = userKeyword.value
  }
  if (typeof filters.value.api_key_id === 'number') {
    snapshotFilters.api_key_id = filters.value.api_key_id
    if (apiKeyKeyword.value) snapshotLabels.apiKeyName = apiKeyKeyword.value
  }
  if (typeof filters.value.account_id === 'number') {
    snapshotFilters.account_id = filters.value.account_id
    if (accountKeyword.value) snapshotLabels.accountName = accountKeyword.value
  }
  if (typeof filters.value.model === 'string' && filters.value.model.trim() !== '') {
    snapshotFilters.model = filters.value.model
  }
  if (typeof filters.value.group_id === 'number') {
    snapshotFilters.group_id = filters.value.group_id
  }
  if (typeof filters.value.stream === 'boolean') {
    snapshotFilters.stream = filters.value.stream
  }
  if (typeof filters.value.billing_type === 'number') {
    snapshotFilters.billing_type = filters.value.billing_type
  }

  return {
    startDate: props.startDate,
    endDate: props.endDate,
    filters: snapshotFilters,
    labels: snapshotLabels
  }
}

let recordRecentTimeout: ReturnType<typeof setTimeout> | null = null
const scheduleRecordRecent = () => {
  if (recordRecentTimeout) clearTimeout(recordRecentTimeout)
  recordRecentTimeout = setTimeout(() => {
    recordRecentTimeout = null
    const snapshot = buildCurrentSnapshot()
    const hasAnyFilter = Object.keys(snapshot.filters).length > 0
    const isDefaultRange =
      snapshot.startDate === defaultStartDate.value && snapshot.endDate === defaultEndDate.value
    if (!hasAnyFilter && isDefaultRange) return

    const key = buildSnapshotKey(snapshot)
    const now = Date.now()
    const list = [...presetsState.value.recent]
    const idx = list.findIndex((p) => buildSnapshotKey(p.snapshot) === key)
    const name = buildSnapshotName(snapshot)

    if (idx >= 0) {
      const existing = list.splice(idx, 1)[0]
      list.unshift({ ...existing, name, snapshot, updatedAt: now })
    } else {
      list.unshift({
        id: `r_${now}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        snapshot,
        createdAt: now,
        updatedAt: now
      })
    }

    presetsState.value.recent = list.slice(0, 8)
    persistPresetsToStorage()
  }, 250)
}

const togglePresetsDropdown = () => {
  showPresetsDropdown.value = !showPresetsDropdown.value
}

const closePresetsDropdown = () => {
  showPresetsDropdown.value = false
}

const applySnapshot = (snapshot: AdminUsagePresetSnapshot) => {
  const snapshotFilters = snapshot?.filters || {}
  const snapshotLabels = snapshot?.labels || {}

  updateStartDate(snapshot.startDate)
  updateEndDate(snapshot.endDate)

  // Reset all supported filters first
  filters.value.user_id = undefined
  filters.value.api_key_id = undefined
  filters.value.account_id = undefined
  filters.value.model = undefined
  filters.value.group_id = null
  filters.value.stream = null
  filters.value.billing_type = null

  userKeyword.value = ''
  userResults.value = []
  showUserDropdown.value = false

  apiKeyKeyword.value = ''
  apiKeyResults.value = []
  showApiKeyDropdown.value = false

  accountKeyword.value = ''
  accountResults.value = []
  showAccountDropdown.value = false

  if (typeof snapshotFilters.user_id === 'number') {
    filters.value.user_id = snapshotFilters.user_id
    userKeyword.value = snapshotLabels.userEmail || `#${snapshotFilters.user_id}`
  }
  if (typeof snapshotFilters.api_key_id === 'number') {
    filters.value.api_key_id = snapshotFilters.api_key_id
    apiKeyKeyword.value = snapshotLabels.apiKeyName || String(snapshotFilters.api_key_id)
  }
  if (typeof snapshotFilters.account_id === 'number') {
    filters.value.account_id = snapshotFilters.account_id
    accountKeyword.value = snapshotLabels.accountName || `#${snapshotFilters.account_id}`
  }
  if (typeof snapshotFilters.model === 'string') {
    filters.value.model = snapshotFilters.model
  }
  if (typeof snapshotFilters.group_id === 'number') {
    filters.value.group_id = snapshotFilters.group_id
  }
  if (typeof snapshotFilters.stream === 'boolean') {
    filters.value.stream = snapshotFilters.stream
  }
  if (typeof snapshotFilters.billing_type === 'number') {
    filters.value.billing_type = snapshotFilters.billing_type
  }
}

const applyPreset = (preset: AdminUsagePresetItem) => {
  applySnapshot(preset.snapshot)
  closePresetsDropdown()
  emitChange()
  appStore.showSuccess(t('admin.usage.presets.applied'))
}

const saveCurrentToFavorites = () => {
  const snapshot = buildCurrentSnapshot()
  const name = presetName.value.trim() || buildSnapshotName(snapshot)
  const key = buildSnapshotKey(snapshot)
  const now = Date.now()

  const list = [...presetsState.value.favorites]
  const idx = list.findIndex((p) => buildSnapshotKey(p.snapshot) === key)

  if (idx >= 0) {
    const existing = list.splice(idx, 1)[0]
    list.unshift({ ...existing, name, snapshot, updatedAt: now })
  } else {
    list.unshift({
      id: `f_${now}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      snapshot,
      createdAt: now,
      updatedAt: now
    })
  }

  presetsState.value.favorites = list.slice(0, 30)
  presetName.value = ''
  persistPresetsToStorage()
  appStore.showSuccess(t('admin.usage.presets.saved'))
}

const deleteFavorite = (id: string) => {
  presetsState.value.favorites = presetsState.value.favorites.filter((p) => p.id !== id)
  persistPresetsToStorage()
  appStore.showSuccess(t('admin.usage.presets.deleted'))
}

const showAdvanced = ref(false)
const hasUserToggledAdvanced = ref(false)
const advancedActiveCount = computed(() => {
  let count = 0

  if (filters.value.group_id !== null && filters.value.group_id !== undefined) count += 1
  if (filters.value.stream !== null && filters.value.stream !== undefined) count += 1
  if (filters.value.billing_type !== null && filters.value.billing_type !== undefined) count += 1

  return count
})

const toggleAdvanced = () => {
  hasUserToggledAdvanced.value = true
  showAdvanced.value = !showAdvanced.value
}

const updateStartDate = (value: string) => {
  emit('update:startDate', value)
  filters.value.start_date = value
}

const updateEndDate = (value: string) => {
  emit('update:endDate', value)
  filters.value.end_date = value
}

const onDateRangePickerChange = (_range: { startDate: string; endDate: string; preset: string | null }) => {
  emitChange()
}

const debounceUserSearch = () => {
  if (userSearchTimeout) clearTimeout(userSearchTimeout)
  userSearchTimeout = setTimeout(async () => {
    if (!userKeyword.value) {
      userResults.value = []
      return
    }
    try {
      userResults.value = await adminAPI.usage.searchUsers(userKeyword.value)
    } catch {
      userResults.value = []
    }
  }, 300)
}

const debounceApiKeySearch = () => {
  if (apiKeySearchTimeout) clearTimeout(apiKeySearchTimeout)
  apiKeySearchTimeout = setTimeout(async () => {
    try {
      apiKeyResults.value = await adminAPI.usage.searchApiKeys(
        filters.value.user_id,
        apiKeyKeyword.value || ''
      )
    } catch {
      apiKeyResults.value = []
    }
  }, 300)
}

const selectUser = async (u: SimpleUser) => {
  userKeyword.value = u.email
  showUserDropdown.value = false
  filters.value.user_id = u.id
  clearApiKey()

  // Auto-load API keys for this user
  try {
    apiKeyResults.value = await adminAPI.usage.searchApiKeys(u.id, '')
  } catch {
    apiKeyResults.value = []
  }

  emitChange()
}

const clearUser = () => {
  userKeyword.value = ''
  userResults.value = []
  showUserDropdown.value = false
  filters.value.user_id = undefined
  clearApiKey()
  emitChange()
}

const selectApiKey = (k: SimpleApiKey) => {
  apiKeyKeyword.value = k.name || String(k.id)
  showApiKeyDropdown.value = false
  filters.value.api_key_id = k.id
  emitChange()
}

const clearApiKey = () => {
  apiKeyKeyword.value = ''
  apiKeyResults.value = []
  showApiKeyDropdown.value = false
  filters.value.api_key_id = undefined
}

const onClearApiKey = () => {
  clearApiKey()
  emitChange()
}

const debounceAccountSearch = () => {
  if (accountSearchTimeout) clearTimeout(accountSearchTimeout)
  accountSearchTimeout = setTimeout(async () => {
    if (!accountKeyword.value) {
      accountResults.value = []
      return
    }
    try {
      const res = await adminAPI.accounts.list(1, 20, { search: accountKeyword.value })
      accountResults.value = res.items.map((a) => ({ id: a.id, name: a.name }))
    } catch {
      accountResults.value = []
    }
  }, 300)
}

const selectAccount = (a: SimpleAccount) => {
  accountKeyword.value = a.name
  showAccountDropdown.value = false
  filters.value.account_id = a.id
  emitChange()
}

const clearAccount = () => {
  accountKeyword.value = ''
  accountResults.value = []
  showAccountDropdown.value = false
  filters.value.account_id = undefined
  emitChange()
}

type FilterChip = { key: string; label: string; onClear: () => void }
const filterChips = computed<FilterChip[]>(() => {
  const chips: FilterChip[] = []

  if (typeof filters.value.user_id === 'number') {
    chips.push({
      key: 'user',
      label: `${t('admin.usage.userFilter')}: ${userKeyword.value || `#${filters.value.user_id}`}`,
      onClear: clearUser
    })
  }

  if (typeof filters.value.api_key_id === 'number') {
    chips.push({
      key: 'api_key',
      label: `${t('usage.apiKeyFilter')}: ${apiKeyKeyword.value || `#${filters.value.api_key_id}`}`,
      onClear: onClearApiKey
    })
  }

  if (typeof filters.value.account_id === 'number') {
    chips.push({
      key: 'account',
      label: `${t('admin.usage.account')}: ${accountKeyword.value || `#${filters.value.account_id}`}`,
      onClear: clearAccount
    })
  }

  if (typeof filters.value.model === 'string' && filters.value.model.trim() !== '') {
    chips.push({
      key: 'model',
      label: `${t('usage.model')}: ${filters.value.model}`,
      onClear: () => {
        filters.value.model = undefined
        emitChange()
      }
    })
  }

  if (typeof filters.value.group_id === 'number') {
    chips.push({
      key: 'group',
      label: `${t('admin.usage.group')}: ${getGroupLabel(filters.value.group_id)}`,
      onClear: () => {
        filters.value.group_id = null
        emitChange()
      }
    })
  }

  if (typeof filters.value.stream === 'boolean') {
    chips.push({
      key: 'stream',
      label: `${t('usage.type')}: ${filters.value.stream ? t('usage.stream') : t('usage.sync')}`,
      onClear: () => {
        filters.value.stream = null
        emitChange()
      }
    })
  }

  if (typeof filters.value.billing_type === 'number') {
    chips.push({
      key: 'billing_type',
      label: `${t('admin.usage.billingType')}: ${getBillingTypeLabel(filters.value.billing_type)}`,
      onClear: () => {
        filters.value.billing_type = null
        emitChange()
      }
    })
  }

  return chips
})

const onApiKeyFocus = () => {
  showApiKeyDropdown.value = true
  // Trigger search if no results yet
  if (apiKeyResults.value.length === 0) {
    debounceApiKeySearch()
  }
}

const onDocumentClick = (e: MouseEvent) => {
  const target = e.target as Node | null
  if (!target) return

  const clickedInsideUser = userSearchRef.value?.contains(target) ?? false
  const clickedInsideApiKey = apiKeySearchRef.value?.contains(target) ?? false
  const clickedInsideAccount = accountSearchRef.value?.contains(target) ?? false
  const clickedInsidePresets = presetDropdownRef.value?.contains(target) ?? false

  if (!clickedInsideUser) showUserDropdown.value = false
  if (!clickedInsideApiKey) showApiKeyDropdown.value = false
  if (!clickedInsideAccount) showAccountDropdown.value = false
  if (!clickedInsidePresets) closePresetsDropdown()
}

const onDocumentKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    closePresetsDropdown()
  }
}

watch(
  () => props.startDate,
  (value) => {
    filters.value.start_date = value
  },
  { immediate: true }
)

watch(
  () => props.endDate,
  (value) => {
    filters.value.end_date = value
  },
  { immediate: true }
)

watch(
  () => filters.value.user_id,
  (userId) => {
    if (!userId) {
      userKeyword.value = ''
      userResults.value = []
    }
  }
)

watch(
  () => filters.value.api_key_id,
  (apiKeyId) => {
    if (!apiKeyId) {
      apiKeyKeyword.value = ''
      apiKeyResults.value = []
    }
  }
)

watch(
  () => filters.value.account_id,
  (accountId) => {
    if (!accountId) {
      accountKeyword.value = ''
      accountResults.value = []
    }
  }
)

watch(
  () => advancedActiveCount.value,
  (count) => {
    if (!hasUserToggledAdvanced.value && count > 0) {
      showAdvanced.value = true
    }
  },
  { immediate: true }
)

watch(
  () => [
    props.startDate,
    props.endDate,
    filters.value.user_id,
    filters.value.api_key_id,
    filters.value.account_id,
    filters.value.model,
    filters.value.group_id,
    filters.value.stream,
    filters.value.billing_type
  ],
  () => scheduleRecordRecent()
)

onMounted(async () => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeyDown)
  loadPresetsFromStorage()
  scheduleRecordRecent()

  try {
    const [gs, ms] = await Promise.all([
      adminAPI.groups.list(1, 1000),
      adminAPI.dashboard.getModelStats({ start_date: props.startDate, end_date: props.endDate })
    ])

    groupOptions.value.push(...gs.items.map((g: any) => ({ value: g.id, label: g.name })))

    const uniqueModels = new Set<string>()
    ms.models?.forEach((s: any) => s.model && uniqueModels.add(s.model))
    modelOptions.value.push(
      ...Array.from(uniqueModels)
        .sort()
        .map((m) => ({ value: m, label: m }))
    )
  } catch {
    // Ignore filter option loading errors (page still usable)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeyDown)
  if (recordRecentTimeout) clearTimeout(recordRecentTimeout)
})
</script>
