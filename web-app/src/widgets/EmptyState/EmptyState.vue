<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '~/shared/ui'

interface Props {
  title?: string
  description?: string
  icon?: string
  actionLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  description: '',
  icon: '📭'
})

const { t } = useI18n()

const displayTitle = computed(() => props.title || t('common.noData'))

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <span class="text-4xl mb-4">{{ icon }}</span>
    <h3 class="text-lg font-medium text-text-primary mb-2">{{ displayTitle }}</h3>
    <p v-if="description" class="text-sm text-text-secondary max-w-sm">
      {{ description }}
    </p>
    <Button
      v-if="actionLabel"
      variant="primary"
      size="sm"
      class="mt-4"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </Button>
  </div>
</template>
