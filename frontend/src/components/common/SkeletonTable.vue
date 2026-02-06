<template>
  <div class="table-container">
    <table class="table">
      <thead>
        <tr>
          <th v-for="i in columns" :key="i" class="px-4 py-3">
            <div class="skeleton-shimmer h-4 w-20 rounded"></div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row">
          <td v-for="col in columns" :key="col" class="px-4 py-3">
            <div
              class="skeleton-shimmer h-4 rounded"
              :style="{ width: getRandomWidth() }"
            ></div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
interface Props {
  rows?: number
  columns?: number
}

withDefaults(defineProps<Props>(), {
  rows: 5,
  columns: 5
})

// Generate consistent random widths for visual variety
const widths = ['40%', '60%', '75%', '50%', '65%', '55%', '70%', '45%']
let widthIndex = 0

function getRandomWidth(): string {
  const width = widths[widthIndex % widths.length]
  widthIndex++
  return width
}
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
