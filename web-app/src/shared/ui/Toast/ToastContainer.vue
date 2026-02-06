<script setup lang="ts">
import { computed } from 'vue'
import Toast from './Toast.vue'
import type { ToastItem, ToastPosition } from './types'

interface Props {
  toasts: ToastItem[]
  position?: ToastPosition
}

const props = withDefaults(defineProps<Props>(), {
  position: 'top-right'
})

defineEmits<{
  close: [id: string]
  action: [callback: () => void]
}>()

const positionClasses = computed(() => {
  const classes: Record<ToastPosition, string> = {
    'top-left': 'top-4 left-4 items-start',
    'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
    'top-right': 'top-4 right-4 items-end',
    'bottom-left': 'bottom-4 left-4 items-start flex-col-reverse',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center flex-col-reverse',
    'bottom-right': 'bottom-4 right-4 items-end flex-col-reverse'
  }
  return classes[props.position]
})
</script>

<template>
  <Teleport to="body">
    <div
      :class="[
        'fixed z-[9999] flex flex-col gap-2 pointer-events-none',
        positionClasses
      ]"
    >
      <Toast
        v-for="(toast, index) in toasts"
        :key="toast.id"
        :toast="toast"
        :index="index"
        class="pointer-events-auto"
        @close="$emit('close', $event)"
        @action="$emit('action', $event)"
      />
    </div>
  </Teleport>
</template>
