<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  status: string
  customLabel?: string
}

const props = defineProps<Props>()

const statusConfig: Record<string, { label: string; class: string }> = {
  active: { label: 'Active', class: 'bg-success/10 text-success border-success/20' },
  inactive: { label: 'Inactive', class: 'bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20' },
  disabled: { label: 'Disabled', class: 'bg-error/10 text-error border-error/20' },
  pending: { label: 'Pending', class: 'bg-warning/10 text-warning border-warning/20' },
  error: { label: 'Error', class: 'bg-error/10 text-error border-error/20' },
  success: { label: 'Success', class: 'bg-success/10 text-success border-success/20' },
  warning: { label: 'Warning', class: 'bg-warning/10 text-warning border-warning/20' }
}

const config = computed(() => {
  return statusConfig[props.status] || { label: props.status, class: 'bg-bg-tertiary text-text-secondary border-border' }
})

const displayLabel = computed(() => props.customLabel || config.value.label)
</script>

<template>
  <span
    :class="[
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      config.class
    ]"
  >
    {{ displayLabel }}
  </span>
</template>
