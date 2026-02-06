<script setup lang="ts">
import { computed } from 'vue'
import { Card, Skeleton } from '~/shared/ui'

interface Props {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  change: 0,
  changeLabel: '',
  loading: false
})

const changeType = computed(() => {
  if (props.change > 0) return 'positive'
  if (props.change < 0) return 'negative'
  return 'neutral'
})

const changeClass = computed(() => {
  const classes: Record<string, string> = {
    positive: 'text-success',
    negative: 'text-error',
    neutral: 'text-text-tertiary'
  }
  return classes[changeType.value]
})

const changeIcon = computed(() => {
  if (props.change > 0) return '↑'
  if (props.change < 0) return '↓'
  return '−'
})
</script>

<template>
  <Card variant="elevated" class="p-6">
    <div v-if="loading" class="space-y-3">
      <Skeleton width="50%" height="16" />
      <Skeleton width="75%" height="32" />
    </div>

    <template v-else>
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-medium text-text-secondary">{{ title }}</h3>
        <span v-if="icon" class="text-2xl">{{ icon }}</span>
      </div>

      <div class="flex items-baseline gap-2">
        <span class="text-2xl font-bold text-text-primary">{{ value }}</span>
        <span v-if="change !== 0" :class="['text-sm font-medium', changeClass]">
          {{ changeIcon }} {{ Math.abs(change) }}%
        </span>
      </div>

      <p v-if="changeLabel" class="mt-1 text-xs text-text-tertiary">
        {{ changeLabel }}
      </p>
    </template>
  </Card>
</template>
