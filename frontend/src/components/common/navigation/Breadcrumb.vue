<template>
  <nav v-if="items.length > 0" class="flex items-center" aria-label="Breadcrumb">
    <ol class="flex items-center gap-1">
      <!-- Home -->
      <li>
        <router-link
          to="/dashboard"
          class="flex items-center text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <Icon name="home" size="sm" />
        </router-link>
      </li>

      <!-- Separator and Items -->
      <template v-for="(item, index) in items" :key="index">
        <li class="flex items-center">
          <Icon name="chevronRight" size="xs" class="mx-1 text-gray-300 dark:text-gray-600" />
          <router-link
            v-if="item.to && index < items.length - 1"
            :to="item.to"
            class="text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {{ item.label }}
          </router-link>
          <span
            v-else
            :class="[
              'text-sm',
              index === items.length - 1
                ? 'font-medium text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400'
            ]"
          >
            {{ item.label }}
          </span>
        </li>
      </template>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import Icon from '@/components/icons/Icon.vue'

interface BreadcrumbItem {
  label: string
  to?: string
}

interface Props {
  items: BreadcrumbItem[]
}

defineProps<Props>()
</script>
