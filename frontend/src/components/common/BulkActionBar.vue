<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-4"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-4"
  >
    <div
      v-if="selectedCount > 0"
      class="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
    >
      <div class="flex items-center gap-4 rounded-2xl bg-gray-900/95 px-5 py-3 shadow-2xl backdrop-blur-xl dark:bg-dark-800/95">
        <!-- Selection Count -->
        <div class="flex items-center gap-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/20">
            <span class="text-sm font-bold text-primary-400">{{ selectedCount }}</span>
          </div>
          <span class="text-sm text-gray-300">
            {{ t('bulkAction.selected', { count: selectedCount }) }}
          </span>
        </div>

        <!-- Divider -->
        <div class="h-6 w-px bg-gray-700"></div>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <slot name="actions">
            <!-- Default actions - can be overridden via slot -->
            <button
              v-for="action in actions"
              :key="action.id"
              @click="handleAction(action)"
              :disabled="action.disabled"
              :class="[
                'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                action.variant === 'danger'
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50'
                  : action.variant === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 disabled:opacity-50'
              ]"
            >
              <Icon v-if="action.icon" :name="action.icon" size="sm" />
              {{ action.label }}
            </button>
          </slot>
        </div>

        <!-- Divider -->
        <div class="h-6 w-px bg-gray-700"></div>

        <!-- Clear Selection -->
        <button
          @click="clearSelection"
          class="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-gray-400 transition-colors hover:bg-gray-700/50 hover:text-gray-200"
        >
          <Icon name="x" size="sm" />
          {{ t('bulkAction.clear') }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Icon, { type IconName } from '@/components/icons/Icon.vue'

export interface BulkAction {
  id: string
  label: string
  icon?: IconName
  variant?: 'default' | 'danger' | 'success'
  disabled?: boolean
}

interface Props {
  selectedCount: number
  actions?: BulkAction[]
}

withDefaults(defineProps<Props>(), {
  actions: () => []
})

const emit = defineEmits<{
  'action': [action: BulkAction]
  'clear': []
}>()

const { t } = useI18n()

const handleAction = (action: BulkAction) => {
  if (!action.disabled) {
    emit('action', action)
  }
}

const clearSelection = () => {
  emit('clear')
}
</script>
