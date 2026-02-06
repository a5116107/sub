<script setup lang="ts">
import { onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useEventListener } from '@vueuse/core'

type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'
type DialogTransition = 'scale' | 'slide-up' | 'slide-down' | 'fade'

interface Props {
  modelValue: boolean
  title?: string
  size?: DialogSize
  persistent?: boolean
  hideClose?: boolean
  closeOnEsc?: boolean
  closeOnOverlay?: boolean
  transition?: DialogTransition
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  persistent: false,
  hideClose: false,
  closeOnEsc: true,
  closeOnOverlay: true,
  transition: 'scale'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
  open: []
}>()

const sizeClasses: Record<DialogSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4'
}

function close() {
  if (!props.persistent) {
    emit('update:modelValue', false)
    emit('close')
  }
}

function handleEsc(event: KeyboardEvent) {
  if (props.closeOnEsc && event.key === 'Escape') {
    close()
  }
}

function handleOverlayClick(event: MouseEvent) {
  if (props.closeOnOverlay && event.target === event.currentTarget) {
    close()
  }
}

watch(() => props.modelValue, async (newVal) => {
  await nextTick()
  if (newVal) {
    emit('open')
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  useEventListener(document, 'keydown', handleEsc)
})

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click="handleOverlayClick"
      >
        <Transition
          :enter-active-class="`transition duration-300 ease-out`"
          :enter-from-class="transition === 'scale' ? 'opacity-0 scale-95' : transition === 'slide-up' ? 'opacity-0 translate-y-4' : 'opacity-0'"
          :enter-to-class="transition === 'scale' ? 'opacity-100 scale-100' : transition === 'slide-up' ? 'opacity-100 translate-y-0' : 'opacity-100'"
          :leave-active-class="`transition duration-200 ease-in`"
          :leave-from-class="transition === 'scale' ? 'opacity-100 scale-100' : transition === 'slide-up' ? 'opacity-100 translate-y-0' : 'opacity-100'"
          :leave-to-class="transition === 'scale' ? 'opacity-0 scale-95' : transition === 'slide-up' ? 'opacity-0 translate-y-4' : 'opacity-0'"
        >
          <div
            v-if="modelValue"
            :class="[
              'relative bg-bg-primary rounded-xl shadow-xl overflow-hidden w-full',
              sizeClasses[size]
            ]"
            @click.stop
          >
            <!-- Header -->
            <div
              v-if="$slots.header || title"
              class="flex items-center justify-between px-6 py-4 border-b border-border"
            >
              <slot name="header">
                <h3 class="text-lg font-semibold text-text-primary">{{ title }}</h3>
              </slot>
              <button
                v-if="!hideClose"
                class="text-text-tertiary hover:text-text-primary transition-colors"
                @click="close"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Content -->
            <div class="px-6 py-4">
              <slot />
            </div>

            <!-- Footer -->
            <div
              v-if="$slots.footer"
              class="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-bg-secondary"
            >
              <slot name="footer" :close="close" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
