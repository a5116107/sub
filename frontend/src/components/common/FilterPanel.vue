<template>
  <div class="filter-panel">
    <!-- Toggle Button -->
    <button
      @click="isExpanded = !isExpanded"
      :class="[
        'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all',
        hasActiveFilters
          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-700 dark:text-gray-300 dark:hover:bg-dark-600'
      ]"
    >
      <Icon name="filter" size="sm" />
      <span>{{ t('filter.filters') }}</span>
      <span
        v-if="activeFilterCount > 0"
        class="flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-xs text-white"
      >
        {{ activeFilterCount }}
      </span>
      <Icon
        name="chevronDown"
        size="xs"
        :class="['transition-transform', isExpanded ? 'rotate-180' : '']"
      />
    </button>

    <!-- Filter Panel -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="isExpanded"
        class="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-lg dark:border-dark-700 dark:bg-dark-800"
      >
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div v-for="filter in filters" :key="filter.key" class="space-y-1.5">
            <label class="text-xs font-medium text-gray-600 dark:text-gray-400">
              {{ filter.label }}
            </label>

            <!-- Select Filter -->
            <select
              v-if="filter.type === 'select'"
              :value="modelValue[filter.key] ?? ''"
              @change="updateFilter(filter.key, ($event.target as HTMLSelectElement).value || null)"
              class="input py-2 text-sm"
            >
              <option value="">{{ filter.placeholder || t('filter.all') }}</option>
              <option
                v-for="option in filter.options"
                :key="String(option.value)"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>

            <!-- Text Filter -->
            <input
              v-else-if="filter.type === 'text'"
              type="text"
              :value="modelValue[filter.key] ?? ''"
              @input="updateFilter(filter.key, ($event.target as HTMLInputElement).value || null)"
              :placeholder="filter.placeholder"
              class="input py-2 text-sm"
            />

            <!-- Boolean Filter -->
            <div v-else-if="filter.type === 'boolean'" class="flex items-center gap-2 pt-1">
              <button
                @click="updateFilter(filter.key, modelValue[filter.key] === true ? null : true)"
                :class="[
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  modelValue[filter.key] === true
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-700 dark:text-gray-300'
                ]"
              >
                {{ t('common.yes') }}
              </button>
              <button
                @click="updateFilter(filter.key, modelValue[filter.key] === false ? null : false)"
                :class="[
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  modelValue[filter.key] === false
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-700 dark:text-gray-300'
                ]"
              >
                {{ t('common.no') }}
              </button>
            </div>

            <!-- Date Filter -->
            <input
              v-else-if="filter.type === 'date'"
              type="date"
              :value="modelValue[filter.key] ?? ''"
              @change="updateFilter(filter.key, ($event.target as HTMLInputElement).value || null)"
              class="input py-2 text-sm"
            />
          </div>
        </div>

        <!-- Actions -->
        <div class="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-dark-700">
          <button
            v-if="hasActiveFilters"
            @click="clearAll"
            class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {{ t('filter.clearAll') }}
          </button>
          <div v-else></div>

          <button
            @click="isExpanded = false"
            class="btn btn-primary btn-sm"
          >
            {{ t('filter.apply') }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'

export interface FilterOption {
  value: string | number | boolean | null
  label: string
}

export interface FilterConfig {
  key: string
  label: string
  type: 'select' | 'multiselect' | 'text' | 'date' | 'daterange' | 'boolean'
  options?: FilterOption[]
  placeholder?: string
}

interface Props {
  filters: FilterConfig[]
  modelValue: Record<string, any>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
  'apply': []
  'clear': []
}>()

const { t } = useI18n()

const isExpanded = ref(false)

const hasActiveFilters = computed(() => {
  return Object.values(props.modelValue).some(v => {
    if (Array.isArray(v)) return v.length > 0
    return v !== null && v !== undefined && v !== ''
  })
})

const activeFilterCount = computed(() => {
  return Object.values(props.modelValue).filter(v => {
    if (Array.isArray(v)) return v.length > 0
    return v !== null && v !== undefined && v !== ''
  }).length
})

const updateFilter = (key: string, value: any) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value
  })
}

const clearAll = () => {
  const cleared: Record<string, any> = {}
  props.filters.forEach(f => {
    cleared[f.key] = null
  })
  emit('update:modelValue', cleared)
  emit('clear')
}
</script>

<style scoped>
.filter-panel {
  @apply relative;
}
</style>
