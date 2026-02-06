<template>
  <div :class="['card p-5', variant === 'primary' ? 'stat-card-primary' : '']">
    <div class="flex items-center gap-4">
      <!-- Icon skeleton -->
      <div class="skeleton-shimmer h-12 w-12 flex-shrink-0 rounded-xl"></div>
      <!-- Content skeleton -->
      <div class="min-w-0 flex-1 space-y-2">
        <div class="skeleton-shimmer h-4 w-3/4 rounded"></div>
        <div class="skeleton-shimmer h-6 w-1/2 rounded"></div>
        <div v-if="showSubtext" class="skeleton-shimmer h-3 w-2/3 rounded"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'default' | 'primary'
  showSubtext?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  showSubtext: true
})
</script>

<style scoped>
.skeleton-shimmer {
  @apply relative overflow-hidden rounded;
  @apply bg-gray-200 dark:bg-dark-700;
}

.skeleton-shimmer::after {
  content: '';
  @apply absolute inset-0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  animation: shimmer 1.5s infinite;
}

:deep(.dark) .skeleton-shimmer::after {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
</style>
