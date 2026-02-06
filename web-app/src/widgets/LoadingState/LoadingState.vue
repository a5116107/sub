<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

withDefaults(defineProps<Props>(), {
  size: 'md',
  text: ''
})

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4'
}
</script>

<template>
  <div class="flex flex-col items-center justify-center py-8">
    <div
      :class="[
        'border-primary-500 border-t-transparent rounded-full animate-spin',
        sizeClasses[size]
      ]"
    />
    <p v-if="text" class="mt-3 text-sm text-text-secondary">
      {{ text }}
    </p>
  </div>
</template>
