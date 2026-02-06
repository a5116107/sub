<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'default' | 'outlined' | 'elevated' | 'ghost'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  hoverable?: boolean
  clickable?: boolean
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  header?: string
  footer?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  padding: 'md',
  radius: 'lg',
  hoverable: false,
  clickable: false,
  loading: false,
  disabled: false,
  fullWidth: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const variantClasses = computed(() => {
  const variants: Record<string, string> = {
    default: 'bg-bg-primary border-border shadow-sm',
    outlined: 'bg-bg-primary border-2 border-border',
    elevated: 'bg-bg-primary border-border shadow-lg',
    ghost: 'bg-bg-secondary border-transparent'
  }
  return variants[props.variant]
})

const paddingClasses = computed(() => {
  const paddings: Record<string, string> = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-8'
  }
  return paddings[props.padding]
})

const radiusClasses = computed(() => {
  const radii: Record<string, string> = {
    none: 'rounded-none',
    sm: 'rounded-md',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    xl: 'rounded-2xl'
  }
  return radii[props.radius]
})

const baseClasses = computed(() => [
  'relative overflow-hidden transition-all duration-250 border',
  variantClasses.value,
  radiusClasses.value,
  props.hoverable && !props.disabled ? 'hover:shadow-md hover:-translate-y-0.5' : '',
  props.clickable && !props.disabled ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default',
  props.disabled ? 'opacity-60 cursor-not-allowed' : '',
  props.fullWidth ? 'w-full' : ''
])

function handleClick(event: MouseEvent) {
  if (props.clickable && !props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<template>
  <div :class="baseClasses" @click="handleClick">
    <!-- Loading Overlay -->
    <div
      v-if="loading"
      class="absolute inset-0 bg-bg-primary/80 backdrop-blur-sm z-10 flex items-center justify-center"
    >
      <div class="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Header -->
    <div
      v-if="$slots.header || $slots['header-actions'] || header"
      :class="[
        'border-b border-border mb-4 flex items-center justify-between',
        padding === 'none' ? 'px-5 py-4' : 'pb-4'
      ]"
    >
      <slot name="header">
        <h3 class="text-lg font-semibold text-text-primary">{{ header }}</h3>
      </slot>
      <div v-if="$slots['header-actions']" class="flex items-center gap-2">
        <slot name="header-actions" />
      </div>
    </div>

    <!-- Content -->
    <div :class="paddingClasses">
      <slot />
    </div>

    <!-- Footer -->
    <div
      v-if="$slots.footer || footer"
      :class="[
        'border-t border-border mt-4',
        padding === 'none' ? 'px-5 py-4' : 'pt-4'
      ]"
    >
      <slot name="footer">
        <p class="text-sm text-text-secondary">{{ footer }}</p>
      </slot>
    </div>
  </div>
</template>
