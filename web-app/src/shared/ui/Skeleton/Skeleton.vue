<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
  lines?: number
  lineHeight?: string | number
  lastLineWidth?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'text',
  animation: 'pulse',
  lines: 1,
  lineHeight: '1em',
  lastLineWidth: '80%'
})

const baseClasses = computed(() => [
  'bg-bg-tertiary rounded',
  props.animation === 'pulse' ? 'animate-pulse' : '',
  props.animation === 'wave' ? 'skeleton-wave' : ''
])

const dimensions = computed(() => {
  const style: Record<string, string> = {}

  if (props.width) {
    style.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  }

  if (props.height) {
    style.height = typeof props.height === 'number' ? `${props.height}px` : props.height
  } else if (props.variant === 'text') {
    style.height = typeof props.lineHeight === 'number' ? `${props.lineHeight}px` : props.lineHeight
  }

  // Border radius based on variant
  if (props.variant === 'circular') {
    style.borderRadius = '50%'
  } else if (props.variant === 'rounded') {
    style.borderRadius = '0.5rem'
  }

  return style
})

const isTextVariant = computed(() => props.variant === 'text' && props.lines > 1)
</script>

<template>
  <!-- Single skeleton -->
  <div
    v-if="!isTextVariant"
    :class="baseClasses"
    :style="dimensions"
  />

  <!-- Multiple text lines -->
  <div
    v-else
    class="space-y-2"
  >
    <div
      v-for="i in lines"
      :key="i"
      :class="baseClasses"
      :style="{
        height: typeof lineHeight === 'number' ? `${lineHeight}px` : lineHeight,
        width: i === lines && lastLineWidth ? lastLineWidth : '100%'
      }"
    />
  </div>
</template>

<style scoped>
.skeleton-wave {
  position: relative;
  overflow: hidden;
}

.skeleton-wave::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  animation: wave 1.5s infinite;
}

@keyframes wave {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.dark .skeleton-wave::after {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
}
</style>
