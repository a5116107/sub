<template>
  <div class="empty-state">
    <!-- Icon with gradient background -->
    <div class="empty-state-icon-wrapper">
      <div
        class="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-dark-800 dark:to-dark-900 shadow-inner"
      >
        <slot name="icon">
          <component v-if="icon" :is="icon" class="h-10 w-10 text-gray-400 dark:text-dark-500" aria-hidden="true" />
          <Icon
            v-else-if="type === 'search'"
            name="search"
            size="xl"
            class="text-gray-400 dark:text-dark-500"
          />
          <Icon
            v-else-if="type === 'error'"
            name="exclamationTriangle"
            size="xl"
            class="text-amber-500"
          />
          <Icon
            v-else-if="type === 'success'"
            name="checkCircle"
            size="xl"
            class="text-emerald-500"
          />
          <Icon
            v-else
            name="inbox"
            size="xl"
            class="text-gray-400 dark:text-dark-500"
          />
        </slot>
      </div>
    </div>

    <!-- Title -->
    <h3 class="empty-state-title">
      {{ displayTitle }}
    </h3>

    <!-- Description -->
    <p v-if="description" class="empty-state-description">
      {{ description }}
    </p>

    <!-- Action -->
    <div v-if="actionText || $slots.action" class="empty-state-action">
      <slot name="action">
        <Button
          v-if="actionText"
          :variant="actionVariant"
          :icon="actionIconName"
          icon-position="left"
          :to="actionTo"
          @click="!actionTo && $emit('action')"
        >
          {{ actionText }}
        </Button>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Component } from 'vue'
import Icon from '@/components/icons/Icon.vue'
import Button from './Button.vue'
import type { IconName } from '@/components/icons/Icon.vue'

const { t } = useI18n()

type EmptyStateType = 'default' | 'search' | 'error' | 'success'
type ActionVariant = 'primary' | 'secondary' | 'ghost'

interface Props {
  icon?: Component | IconName
  type?: EmptyStateType
  title?: string
  description?: string
  actionText?: string
  actionTo?: string | object
  actionIcon?: IconName
  actionVariant?: ActionVariant
  message?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  description: '',
  actionIcon: 'plus',
  actionVariant: 'primary'
})

const displayTitle = computed(() => props.title || t('common.noData'))

const actionIconName = computed(() => {
  if (props.actionIcon) return props.actionIcon
  return 'plus'
})

defineEmits(['action'])
</script>
