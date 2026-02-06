<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
  count?: number | string
  max?: number
  showZero?: boolean
  offset?: [number, number]
  pulse?: boolean
  bordered?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  max: 99,
  showZero: false,
  offset: () => [0, 0],
  pulse: false,
  bordered: false
})

const displayCount = computed(() => {
  if (props.count === undefined) return ''
  const num = typeof props.count === 'string' ? parseInt(props.count) : props.count
  if (num === 0 && !props.showZero) return ''
  if (num > props.max) return `${props.max}+`
  return String(num)
})

const isVisible = computed(() => {
  if (props.dot) return true
  if (props.count === undefined) return true
  const num = typeof props.count === 'string' ? parseInt(props.count) : props.count
  return num > 0 || props.showZero
})

const variantClasses = computed(() => {
  const classes: Record<string, string> = {
    default: 'bg-bg-tertiary text-text-secondary border-border',
    primary: 'bg-primary-500 text-white border-primary-500',
    success: 'bg-success text-white border-success',
    warning: 'bg-warning text-white border-warning',
    danger: 'bg-error text-white border-error',
    info: 'bg-info text-white border-info'
  }
  return classes[props.variant]
})

const sizeClasses = computed(() => {
  const classes: Record<string, { badge: string; dot: string }> = {
    sm: { badge: 'min-w-[16px] h-4 px-1 text-[10px]', dot: 'w-2 h-2' },
    md: { badge: 'min-w-[20px] h-5 px-1.5 text-xs', dot: 'w-2.5 h-2.5' },
    lg: { badge: 'min-w-[24px] h-6 px-2 text-sm', dot: 'w-3 h-3' }
  }
  return classes[props.size]
})

const offsetStyle = computed(() => {
  const [x, y] = props.offset
  return {
    transform: `translate(${x}px, ${y}px)`
  }
})
</script>

<template>
  <div class="relative inline-flex">
    <slot />

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-0"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-0"
    >
      <span
        v-if="isVisible"
        :class="[
          'absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full font-medium',
          'border-2',
          variantClasses,
          sizeClasses.badge,
          bordered ? 'border-bg-primary' : '',
          pulse ? 'animate-pulse' : ''
        ]"
        :style="offsetStyle"
      >
        <template v-if="dot">
          <span :class="sizeClasses.dot" />
        </template>
        <template v-else>
          {{ displayCount }}
        </template>
      </span>
    </Transition>
  </div>
</template>
