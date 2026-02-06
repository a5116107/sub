<template>
  <div :class="cardClasses">
    <!-- Glow decoration for primary variant -->
    <div v-if="variant === 'primary'" class="stat-card-glow"></div>

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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import Icon from '@/components/icons/Icon.vue'

type ChangeType = 'up' | 'down' | 'neutral'
type IconVariant = 'primary' | 'success' | 'warning' | 'danger'
type CardVariant = 'default' | 'primary' | 'secondary'

interface Props {
  title: string
  value: number | string
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
  if (props.variant === 'primary') {
    return `${base} stat-card-primary`
  }
  return base
})

const valueClasses = computed(() => {
  const base = 'stat-value'
  if (props.variant === 'primary') {
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
