<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  indeterminate?: boolean
  showValue?: boolean
  valueFormat?: 'percent' | 'fraction' | 'custom'
  customFormat?: (value: number, max: number) => string
  striped?: boolean
  animated?: boolean
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'full'
}

const props = withDefaults(defineProps<Props>(), {
  max: 100,
  size: 'md',
  variant: 'primary',
  showValue: false,
  valueFormat: 'percent',
  striped: false,
  animated: false,
  radius: 'full'
})

const percentage = computed(() => {
  if (props.indeterminate) return 0
  return Math.min(100, Math.max(0, (props.value / props.max) * 100))
})

const displayValue = computed(() => {
  if (props.customFormat) {
    return props.customFormat(props.value, props.max)
  }

  switch (props.valueFormat) {
    case 'percent':
      return `${Math.round(percentage.value)}%`
    case 'fraction':
      return `${props.value} / ${props.max}`
    default:
      return `${Math.round(percentage.value)}%`
  }
})

const sizeClasses = computed(() => {
  const sizes: Record<string, string> = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  }
  return sizes[props.size]
})

const variantClasses = computed(() => {
  const classes: Record<string, string> = {
    default: 'bg-bg-tertiary',
    primary: 'bg-primary-500',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-error',
    info: 'bg-info'
  }
  return classes[props.variant]
})

const radiusClasses = computed(() => {
  const radii: Record<string, string> = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  }
  return radii[props.radius]
})
</script>

<template>
  <div class="w-full">
    <div class="flex items-center justify-between mb-1" v-if="showValue">
      <slot name="label" />
      <span class="text-sm font-medium text-text-secondary">{{ displayValue }}</span>
    </div>

    <div
      :class="[
        'w-full overflow-hidden bg-bg-tertiary',
        sizeClasses,
        radiusClasses
      ]"
    >
      <div
        :class="[
          'h-full transition-all duration-300 ease-out',
          variantClasses,
          radiusClasses,
          striped ? 'progress-striped' : '',
          animated ? 'progress-animated' : '',
          indeterminate ? 'progress-indeterminate' : ''
        ]"
        :style="{ width: indeterminate ? '100%' : `${percentage}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
.progress-striped {
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.15) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.15) 50%,
    rgba(255, 255, 255, 0.15) 75%,
    transparent 75%,
    transparent
  );
  background-size: 1rem 1rem;
}

.progress-animated {
  animation: progress-bar-stripes 1s linear infinite;
}

@keyframes progress-bar-stripes {
  0% {
    background-position: 1rem 0;
  }
  100% {
    background-position: 0 0;
  }
}

.progress-indeterminate {
  position: relative;
  overflow: hidden;
}

.progress-indeterminate::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 100%;
  background: inherit;
  animation: indeterminate 2s ease-in-out infinite;
}

@keyframes indeterminate {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(100%);
  }
}
</style>
