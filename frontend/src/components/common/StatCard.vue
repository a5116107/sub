<template>
  <div :class="cardClasses">
    <!-- Glow decoration for hero/primary variant -->
    <div v-if="variant === 'hero' || variant === 'primary'" class="stat-card-glow"></div>

    <!-- Hero variant layout -->
    <template v-if="variant === 'hero'">
      <div class="flex flex-col">
        <div class="flex items-center justify-between">
          <p class="stat-label text-sm">{{ title }}</p>
          <div :class="['stat-icon', iconClass]">
            <component v-if="icon" :is="icon" class="h-6 w-6" aria-hidden="true" />
          </div>
        </div>
        <p class="mt-2 text-4xl font-bold text-gray-900 dark:text-white">{{ formattedValue }}</p>
        <div v-if="subtitle" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {{ subtitle }}
        </div>
        <span v-if="change !== undefined" :class="['stat-trend mt-2', trendClass]">
          <Icon
            v-if="changeType !== 'neutral'"
            name="arrowUp"
            size="xs"
            :class="changeType === 'down' && 'rotate-180'"
          />
          {{ formattedChange }}
        </span>
      </div>
    </template>

    <!-- Compact variant layout -->
    <template v-else-if="variant === 'compact'">
      <div class="flex items-center gap-3">
        <div :class="['stat-icon h-8 w-8 rounded-lg', iconClass]">
          <component v-if="icon" :is="icon" class="h-4 w-4" aria-hidden="true" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline justify-between gap-2">
            <p class="stat-label truncate text-xs">{{ title }}</p>
            <p class="text-lg font-semibold text-gray-900 dark:text-white">{{ formattedValue }}</p>
          </div>
        </div>
      </div>
    </template>

    <!-- Inline variant layout -->
    <template v-else-if="variant === 'inline'">
      <div class="flex items-center gap-2">
        <div :class="['flex h-6 w-6 items-center justify-center rounded', iconClass]">
          <component v-if="icon" :is="icon" class="h-3.5 w-3.5" aria-hidden="true" />
        </div>
        <span class="text-xs text-gray-500 dark:text-gray-400">{{ title }}:</span>
        <span class="text-sm font-medium text-gray-900 dark:text-white">{{ formattedValue }}</span>
        <span v-if="change !== undefined" :class="['stat-trend text-xs', trendClass]">
          <Icon
            v-if="changeType !== 'neutral'"
            name="arrowUp"
            size="xs"
            :class="changeType === 'down' && 'rotate-180'"
          />
          {{ formattedChange }}
        </span>
      </div>
    </template>

    <!-- Default/Primary variant layout -->
    <template v-else>
      <div :class="['stat-icon', iconClass]">
        <component v-if="icon" :is="icon" class="h-6 w-6" aria-hidden="true" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="stat-label truncate">{{ title }}</p>
        <div class="mt-1 flex items-baseline gap-2">
          <p :class="valueClasses">{{ formattedValue }}</p>
          <span v-if="change !== undefined" :class="['stat-trend', trendClass]">
            <Icon
              v-if="changeType !== 'neutral'"
              name="arrowUp"
              size="xs"
              :class="changeType === 'down' && 'rotate-180'"
            />
            {{ formattedChange }}
          </span>
        </div>
        <div v-if="subtitle" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {{ subtitle }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import Icon from '@/components/icons/Icon.vue'

type ChangeType = 'up' | 'down' | 'neutral'
type IconVariant = 'primary' | 'success' | 'warning' | 'danger'
type CardVariant = 'default' | 'primary' | 'hero' | 'compact' | 'inline'

interface Props {
  title: string
  value: number | string
  subtitle?: string
  icon?: Component
  iconVariant?: IconVariant
  variant?: CardVariant
  change?: number
  changeType?: ChangeType
  formatValue?: (value: number | string) => string
}

const props = withDefaults(defineProps<Props>(), {
  changeType: 'neutral',
  iconVariant: 'primary',
  variant: 'default'
})

const cardClasses = computed(() => {
  const base = 'stat-card'
  switch (props.variant) {
    case 'hero':
      return `${base} stat-card-hero p-6`
    case 'primary':
      return `${base} stat-card-primary`
    case 'compact':
      return `${base} stat-card-compact p-3`
    case 'inline':
      return 'inline-flex items-center'
    default:
      return base
  }
})

const valueClasses = computed(() => {
  const base = 'stat-value'
  if (props.variant === 'primary' || props.variant === 'hero') {
    return `${base} stat-value-primary`
  }
  return base
})

const formattedValue = computed(() => {
  if (props.formatValue) {
    return props.formatValue(props.value)
  }
  if (typeof props.value === 'number') {
    return props.value.toLocaleString()
  }
  return props.value
})

const formattedChange = computed(() => {
  if (props.change === undefined) return ''
  const absChange = Math.abs(props.change)
  return `${absChange}%`
})

const iconClass = computed(() => {
  const classes: Record<IconVariant, string> = {
    primary: 'stat-icon-primary',
    success: 'stat-icon-success',
    warning: 'stat-icon-warning',
    danger: 'stat-icon-danger'
  }
  return classes[props.iconVariant]
})

const trendClass = computed(() => {
  const classes: Record<ChangeType, string> = {
    up: 'stat-trend-up',
    down: 'stat-trend-down',
    neutral: 'text-gray-500 dark:text-dark-400'
  }
  return classes[props.changeType]
})
</script>

<style scoped>
.stat-card-hero {
  @apply relative overflow-hidden;
  @apply bg-gradient-to-br from-primary-500/10 via-transparent to-gold-500/5;
  @apply border-l-4 border-l-primary-500;
}

.stat-card-hero::before {
  content: '';
  @apply absolute inset-0;
  @apply bg-gradient-to-br from-primary-400/5 to-transparent;
  @apply pointer-events-none;
}

.stat-card-compact {
  @apply transition-all duration-200;
}

.stat-card-compact:hover {
  @apply bg-gray-50 dark:bg-dark-800/80;
}
</style>
