<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { ToastItem } from './types'

interface Props {
  toast: ToastItem
  index: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: [id: string]
  action: [callback: () => void]
}>()

const progress = ref(100)
const isPaused = ref(false)
let progressInterval: ReturnType<typeof setInterval> | null = null

const typeClasses = computed(() => {
  const classes: Record<string, { bg: string; border: string; icon: string; progress: string }> = {
    success: {
      bg: 'bg-success/10',
      border: 'border-success/20',
      icon: 'text-success',
      progress: 'bg-success'
    },
    error: {
      bg: 'bg-error/10',
      border: 'border-error/20',
      icon: 'text-error',
      progress: 'bg-error'
    },
    warning: {
      bg: 'bg-warning/10',
      border: 'border-warning/20',
      icon: 'text-warning',
      progress: 'bg-warning'
    },
    info: {
      bg: 'bg-info/10',
      border: 'border-info/20',
      icon: 'text-info',
      progress: 'bg-info'
    }
  }
  return classes[props.toast.type]
})

const typeIcons = computed(() => {
  const icons: Record<string, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  }
  return icons[props.toast.type]
})

function startProgress() {
  if (props.toast.duration === 0) return

  const step = 100 / (props.toast.duration / 100)
  progressInterval = setInterval(() => {
    if (!isPaused.value) {
      progress.value -= step
      if (progress.value <= 0) {
        emit('close', props.toast.id)
      }
    }
  }, 100)
}

function pause() {
  isPaused.value = true
}

function resume() {
  isPaused.value = false
}

onMounted(() => {
  startProgress()
})

onUnmounted(() => {
  if (progressInterval) {
    clearInterval(progressInterval)
  }
})
</script>

<template>
  <div
    :class="[
      'relative flex items-start gap-3 p-4 rounded-lg border shadow-lg min-w-[300px] max-w-[500px]',
      'transform transition-all duration-300',
      'bg-bg-primary',
      typeClasses.bg,
      typeClasses.border
    ]"
    :style="{ zIndex: 1000 + index }"
    @mouseenter="pause"
    @mouseleave="resume"
  >
    <!-- Icon -->
    <span
      :class="[
        'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold',
        typeClasses.bg,
        typeClasses.icon
      ]"
    >
      {{ typeIcons }}
    </span>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium text-text-primary">
        {{ toast.message }}
      </p>
      <button
        v-if="toast.action"
        class="mt-2 text-sm font-medium hover:underline"
        :class="typeClasses.icon"
        @click="emit('action', toast.action.callback)"
      >
        {{ toast.action.label }}
      </button>
    </div>

    <!-- Close Button -->
    <button
      v-if="toast.closable"
      class="flex-shrink-0 text-text-tertiary hover:text-text-primary transition-colors"
      @click="emit('close', toast.id)"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <!-- Progress Bar -->
    <div
      v-if="toast.duration > 0"
      class="absolute bottom-0 left-0 h-0.5 transition-all duration-100"
      :class="typeClasses.progress"
      :style="{ width: `${progress}%` }"
    />
  </div>
</template>
