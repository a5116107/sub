<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="visible"
      :class="[
        'inline-status inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium',
        statusClasses
      ]"
    >
      <!-- Icon -->
      <Icon
        v-if="showIcon"
        :name="iconName"
        size="xs"
        :class="[type === 'loading' ? 'animate-spin' : '']"
      />

      <!-- Message -->
      <span>{{ message }}</span>

      <!-- Dismiss button -->
      <button
        v-if="dismissible"
        @click="dismiss"
        class="ml-1 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
        aria-label="Dismiss"
      >
        <Icon name="x" size="xs" />
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import Icon, { type IconName } from '@/components/icons/Icon.vue'

type StatusType = 'success' | 'error' | 'warning' | 'info' | 'loading'

interface Props {
  type?: StatusType
  message: string
  showIcon?: boolean
  dismissible?: boolean
  autoDismiss?: number // ms, 0 = no auto dismiss
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  showIcon: true,
  dismissible: false,
  autoDismiss: 0
})

const emit = defineEmits<{
  dismiss: []
}>()

const visible = ref(true)
let dismissTimer: ReturnType<typeof setTimeout> | null = null

const statusClasses = computed(() => {
  const classes: Record<StatusType, string> = {
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    loading: 'bg-gray-100 text-gray-700 dark:bg-dark-700 dark:text-gray-300'
  }
  return classes[props.type]
})

const iconName = computed((): IconName => {
  const icons: Record<StatusType, IconName> = {
    success: 'checkCircle',
    error: 'xCircle',
    warning: 'exclamationTriangle',
    info: 'infoCircle',
    loading: 'refresh'
  }
  return icons[props.type]
})

const dismiss = () => {
  visible.value = false
  emit('dismiss')
}

const startAutoDismiss = () => {
  if (props.autoDismiss > 0) {
    dismissTimer = setTimeout(dismiss, props.autoDismiss)
  }
}

const clearAutoDismiss = () => {
  if (dismissTimer) {
    clearTimeout(dismissTimer)
    dismissTimer = null
  }
}

watch(() => props.autoDismiss, () => {
  clearAutoDismiss()
  startAutoDismiss()
})

onMounted(() => {
  startAutoDismiss()
})

onUnmounted(() => {
  clearAutoDismiss()
})

defineExpose({
  show: () => { visible.value = true },
  hide: () => { visible.value = false },
  dismiss
})
</script>
