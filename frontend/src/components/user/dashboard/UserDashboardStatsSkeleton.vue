<template>
  <!-- Row 1: Primary Stats (2 large cards) -->
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
    <SkeletonCard v-if="!isSimple" variant="primary" />
    <SkeletonCard variant="primary" />
    <SkeletonCard v-if="isSimple" variant="primary" />
  </div>

  <!-- Row 2: Secondary Stats (4 small cards) -->
  <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
    <SkeletonCard v-for="i in 4" :key="i" />
  </div>

  <!-- Row 3: More Stats -->
  <div class="grid grid-cols-2 gap-4 lg:grid-cols-4 mt-4">
    <SkeletonCard v-for="i in 4" :key="i" />
  </div>
</template>

<script setup lang="ts">
import SkeletonCard from '@/components/common/SkeletonCard.vue'

defineProps<{
  isSimple: boolean
}>()
</script>
