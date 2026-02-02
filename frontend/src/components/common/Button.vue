<template>
  <button
    :type="type"
    :disabled="isDisabled"
    :class="buttonClasses"
    @click="handleClick"
  >
    <!-- Loading Spinner -->
    <span
      v-if="loading"
      class="absolute inset-0 flex items-center justify-center"
    >
      <svg
        class="h-5 w-5 animate-spin"
        :class="loadingIconColor"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </span>

    <!-- Button Content -->
    <span
      :class="[
        'flex items-center justify-center gap-2',
        loading && 'opacity-0'
      ]"
    >
      <!-- Left Icon -->
      <Icon
        v-if="icon && iconPosition === 'left'"
        :name="icon"
        :size="iconSize"
        :stroke-width="iconStrokeWidth"
      />

      <!-- Label -->
      <slot>{{ label }}</slot>

      <!-- Right Icon -->
      <Icon
        v-if="icon && iconPosition === 'right'"
        :name="icon"
        :size="iconSize"
        :stroke-width="iconStrokeWidth"
      />
    </span>

    <!-- Ripple Effect -->
    <span
      v-if="ripple && !disabled && !loading"
      class="absolute inset-0 overflow-hidden rounded-[inherit]"
      @mousedown="createRipple"
    >
      <span
        v-for="rippleItem in ripples"
        :key="rippleItem.id"
        class="ripple-effect"
        :style="{
          left: rippleItem.x + 'px',
          top: rippleItem.y + 'px',
          width: rippleItem.size + 'px',
          height: rippleItem.size + 'px'
        }"
        @animationend="removeRipple(rippleItem.id)"
      />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from '@/components/icons/Icon.vue'
import type { IconName } from '@/components/icons/Icon.vue'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning' | 'premium' | 'outline'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type IconPosition = 'left' | 'right'

interface Props {
  // Basic props
  type?: 'button' | 'submit' | 'reset'
  label?: string
  disabled?: boolean
  loading?: boolean

  // Style variants
  variant?: ButtonVariant
  size?: ButtonSize

  // Icon props
  icon?: IconName
  iconPosition?: IconPosition
  iconSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  iconStrokeWidth?: number

  // Feature flags
  ripple?: boolean
  block?: boolean

  // Accessibility
  ariaLabel?: string
}

interface RippleItem {
  id: number
  x: number
  y: number
  size: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'button',
  variant: 'primary',
  size: 'md',
  iconPosition: 'left',
  iconSize: 'md',
  iconStrokeWidth: 2,
  ripple: true,
  block: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

// Ripple state
const ripples = ref<RippleItem[]>([])
let rippleId = 0

const isDisabled = computed(() => props.disabled || props.loading)

const baseClasses = computed(() => [
  'relative inline-flex items-center justify-center',
  'font-medium transition-all duration-200 ease-out',
  'focus:outline-none focus:ring-2 focus:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'active:scale-[0.98]',
  props.block ? 'w-full' : ''
])

const sizeClasses = computed(() => {
  const sizes: Record<ButtonSize, string> = {
    xs: 'rounded-lg px-2.5 py-1.5 text-xs gap-1',
    sm: 'rounded-lg px-3 py-2 text-sm gap-1.5',
    md: 'rounded-xl px-4 py-2.5 text-sm gap-2',
    lg: 'rounded-xl px-6 py-3 text-base gap-2',
    xl: 'rounded-2xl px-8 py-4 text-lg gap-3'
  }
  return sizes[props.size]
})

const variantClasses = computed(() => {
  const variants: Record<ButtonVariant, string> = {
    primary: [
      'bg-gradient-to-r from-primary-500 to-primary-600',
      'text-white shadow-lg shadow-primary-500/25',
      'hover:from-primary-600 hover:to-primary-700 hover:shadow-xl hover:shadow-primary-500/30',
      'focus:ring-primary-500/50',
      'dark:shadow-primary-500/20'
    ].join(' '),

    secondary: [
      'bg-white dark:bg-dark-800',
      'text-gray-700 dark:text-gray-200',
      'border border-gray-200 dark:border-dark-600',
      'shadow-sm hover:bg-gray-50 dark:hover:bg-dark-700',
      'hover:border-gray-300 dark:hover:border-dark-500',
      'hover:-translate-y-0.5 hover:shadow-md',
      'focus:ring-gray-500/30'
    ].join(' '),

    ghost: [
      'bg-transparent',
      'text-gray-600 dark:text-gray-300',
      'hover:bg-gray-100 dark:hover:bg-dark-800',
      'hover:-translate-y-0.5',
      'focus:ring-gray-500/30'
    ].join(' '),

    danger: [
      'bg-gradient-to-r from-red-500 to-red-600',
      'text-white shadow-lg shadow-red-500/25',
      'hover:from-red-600 hover:to-red-700 hover:shadow-xl hover:shadow-red-500/30',
      'focus:ring-red-500/50'
    ].join(' '),

    success: [
      'bg-gradient-to-r from-emerald-500 to-emerald-600',
      'text-white shadow-lg shadow-emerald-500/25',
      'hover:from-emerald-600 hover:to-emerald-700 hover:shadow-xl hover:shadow-emerald-500/30',
      'focus:ring-emerald-500/50',
      'dark:shadow-emerald-500/20'
    ].join(' '),

    warning: [
      'bg-gradient-to-r from-amber-500 to-amber-600',
      'text-white shadow-lg shadow-amber-500/25',
      'hover:from-amber-600 hover:to-amber-700 hover:shadow-xl hover:shadow-amber-500/30',
      'focus:ring-amber-500/50',
      'dark:shadow-amber-500/20'
    ].join(' '),

    premium: [
      'bg-gradient-to-r from-gold-500 to-gold-600',
      'text-white shadow-lg shadow-gold-500/25',
      'hover:from-gold-600 hover:to-gold-700 hover:shadow-xl hover:shadow-gold-500/30',
      'focus:ring-gold-500/50'
    ].join(' '),

    outline: [
      'bg-transparent',
      'text-primary-600 dark:text-primary-400',
      'border-2 border-primary-500',
      'hover:bg-primary-50 dark:hover:bg-primary-900/20',
      'hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary-500/20',
      'focus:ring-primary-500/50'
    ].join(' ')
  }
  return variants[props.variant]
})

const loadingIconColor = computed(() => {
  const colors: Record<ButtonVariant, string> = {
    primary: 'text-white',
    secondary: 'text-gray-600 dark:text-gray-300',
    ghost: 'text-gray-600 dark:text-gray-300',
    danger: 'text-white',
    success: 'text-white',
    warning: 'text-white',
    premium: 'text-white',
    outline: 'text-primary-600 dark:text-primary-400'
  }
  return colors[props.variant]
})

const buttonClasses = computed(() => [
  ...baseClasses.value,
  sizeClasses.value,
  variantClasses.value
])

// Ripple effect
const createRipple = (event: MouseEvent) => {
  if (props.disabled || props.loading || !props.ripple) return

  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()

  const size = Math.max(rect.width, rect.height)
  const x = event.clientX - rect.left - size / 2
  const y = event.clientY - rect.top - size / 2

  ripples.value.push({
    id: ++rippleId,
    x,
    y,
    size
  })
}

const removeRipple = (id: number) => {
  const index = ripples.value.findIndex(r => r.id === id)
  if (index > -1) {
    ripples.value.splice(index, 1)
  }
}

const handleClick = (event: MouseEvent) => {
  if (!props.loading && !props.disabled) {
    emit('click', event)
  }
}
</script>

<style scoped>
.ripple-effect {
  position: absolute;
  border-radius: 50%;
  background-color: currentColor;
  opacity: 0.3;
  transform: scale(0);
  animation: ripple 0.6s ease-out;
  pointer-events: none;
}

@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .ripple-effect {
    animation: none;
    opacity: 0;
  }
}
</style>
