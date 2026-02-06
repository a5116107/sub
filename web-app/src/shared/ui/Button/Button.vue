<script setup lang="ts">
import { computed } from 'vue'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning' | 'info'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type ButtonRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

interface Props {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  block?: boolean
  rounded?: ButtonRadius
  shadow?: boolean
  icon?: boolean
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  block: false,
  rounded: 'lg',
  shadow: false,
  icon: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const variantClasses = computed(() => {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 active:bg-primary-700',
    secondary: 'bg-bg-tertiary text-text-primary hover:bg-border focus:ring-primary-500',
    outline: 'bg-transparent border-2 border-primary-500 text-primary-600 hover:bg-primary-50 focus:ring-primary-500',
    ghost: 'bg-transparent text-text-secondary hover:bg-bg-tertiary hover:text-text-primary focus:ring-primary-500',
    danger: 'bg-error text-white hover:bg-error/90 focus:ring-error active:bg-error/80',
    success: 'bg-success text-white hover:bg-success/90 focus:ring-success active:bg-success/80',
    warning: 'bg-warning text-white hover:bg-warning/90 focus:ring-warning active:bg-warning/80',
    info: 'bg-info text-white hover:bg-info/90 focus:ring-info active:bg-info/80'
  }
  return variants[props.variant]
})

const sizeClasses = computed(() => {
  const sizes: Record<ButtonSize, string> = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
    xl: 'px-6 py-3 text-base'
  }
  return sizes[props.size]
})

const radiusClasses = computed(() => {
  const radii: Record<ButtonRadius, string> = {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  }
  return radii[props.rounded]
})

const baseClasses = computed(() => [
  'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200',
  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-primary',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
  'active:scale-[0.98]',
  variantClasses.value,
  sizeClasses.value,
  radiusClasses.value,
  props.shadow ? 'shadow-md hover:shadow-lg' : '',
  props.block ? 'w-full' : '',
  props.icon ? '!p-2' : ''
])

function handleClick(event: MouseEvent) {
  if (!props.loading && !props.disabled) {
    emit('click', event)
  }
}
</script>

<template>
  <button
    :type="type"
    :class="baseClasses"
    :disabled="disabled || loading"
    :aria-label="ariaLabel"
    :aria-busy="loading"
    @click="handleClick"
  >
    <span
      v-if="loading"
      class="inline-block border-2 border-current border-t-transparent rounded-full animate-spin"
      :class="{
        'w-3 h-3': size === 'xs' || size === 'sm',
        'w-4 h-4': size === 'md',
        'w-5 h-5': size === 'lg' || size === 'xl'
      }"
      aria-hidden="true"
    />
    <slot />
  </button>
</template>
