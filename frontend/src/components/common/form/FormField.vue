<template>
  <div :class="['form-field', { 'form-field-error': hasError, 'form-field-inline': inline }]">
    <label v-if="label" :for="fieldId" :class="labelClasses">
      {{ label }}
      <span v-if="required" class="ml-0.5 text-red-500">*</span>
      <span v-if="optional" class="ml-1 text-xs font-normal text-gray-400 dark:text-dark-500">
        ({{ t('common.optional') }})
      </span>
    </label>

    <div :class="['form-field-input', inline ? 'flex-1' : '']">
      <slot />

      <!-- Hint text -->
      <p v-if="hint && !hasError" class="input-hint">
        {{ hint }}
      </p>

      <!-- Error message -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-1"
      >
        <p v-if="hasError" class="input-error-text flex items-center gap-1">
          <Icon name="exclamationCircle" size="xs" />
          {{ errorMessage }}
        </p>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'

interface Props {
  label?: string
  hint?: string
  error?: string | boolean
  required?: boolean
  optional?: boolean
  inline?: boolean
  fieldId?: string
}

const props = defineProps<Props>()

const { t } = useI18n()

const hasError = computed(() => {
  return typeof props.error === 'string' ? props.error.length > 0 : props.error
})

const errorMessage = computed(() => {
  return typeof props.error === 'string' ? props.error : ''
})

const labelClasses = computed(() => {
  const base = 'input-label'
  if (props.inline) {
    return `${base} mb-0 mr-3 min-w-[120px] flex-shrink-0`
  }
  return base
})
</script>

<style scoped>
.form-field-inline {
  @apply flex items-start;
}

.form-field-error .input,
.form-field-error .select,
.form-field-error textarea {
  @apply border-red-500 focus:border-red-500 focus:ring-red-500/30;
}
</style>
