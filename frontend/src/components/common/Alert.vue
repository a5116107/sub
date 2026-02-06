<template>
  <div :class="['rounded-xl border p-4', variantClasses]" role="alert">
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0 mt-0.5">
        <Icon :name="iconName" size="md" :class="iconClass" />
      </div>
      <div class="flex-1 min-w-0">
        <p v-if="title" class="text-sm font-semibold" :class="titleClass">{{ title }}</p>
        <p class="text-sm" :class="messageClass"><slot>{{ message }}</slot></p>
      </div>
      <button
        v-if="dismissible"
        @click="$emit('dismiss')"
        :class="dismissClass"
        type="button"
        :aria-label="t('common.close')"
      >
        <Icon name="x" size="sm" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import type { IconName } from '@/components/icons/Icon.vue'

const { t } = useI18n()

type AlertVariant = 'error' | 'warning' | 'success' | 'info'

interface Props {
  variant?: AlertVariant
  title?: string
  message?: string
  dismissible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'info',
  dismissible: false
})

defineEmits<{
  dismiss: []
}>()

const variantClasses = computed(() => {
  const variants: Record<AlertVariant, string> = {
    error: 'border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-900/20',
    warning: 'border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/20',
    success: 'border-green-200 bg-green-50 dark:border-green-800/50 dark:bg-green-900/20',
    info: 'border-blue-200 bg-blue-50 dark:border-blue-800/50 dark:bg-blue-900/20'
  }
  return variants[props.variant]
})

const iconName = computed((): IconName => {
  const icons: Record<AlertVariant, IconName> = {
    error: 'exclamationCircle',
    warning: 'exclamationTriangle',
    success: 'checkCircle',
    info: 'infoCircle'
  }
  return icons[props.variant]
})

const iconClass = computed(() => {
  const colors: Record<AlertVariant, string> = {
    error: 'text-red-500',
    warning: 'text-amber-500',
    success: 'text-green-500',
    info: 'text-blue-500'
  }
  return colors[props.variant]
})

const titleClass = computed(() => {
  const colors: Record<AlertVariant, string> = {
    error: 'text-red-800 dark:text-red-200',
    warning: 'text-amber-800 dark:text-amber-200',
    success: 'text-green-800 dark:text-green-200',
    info: 'text-blue-800 dark:text-blue-200'
  }
  return colors[props.variant]
})

const messageClass = computed(() => {
  const colors: Record<AlertVariant, string> = {
    error: 'text-red-700 dark:text-red-400',
    warning: 'text-amber-700 dark:text-amber-400',
    success: 'text-green-700 dark:text-green-400',
    info: 'text-blue-700 dark:text-blue-400'
  }
  return colors[props.variant]
})

const dismissClass = computed(() => {
  const colors: Record<AlertVariant, string> = {
    error: 'text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300',
    warning: 'text-amber-400 hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-300',
    success: 'text-green-400 hover:text-green-600 dark:text-green-500 dark:hover:text-green-300',
    info: 'text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300'
  }
  return [
    '-m-1 flex-shrink-0 rounded p-1 transition-colors',
    'hover:bg-black/5 dark:hover:bg-white/5',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    colors[props.variant]
  ].join(' ')
})
</script>
