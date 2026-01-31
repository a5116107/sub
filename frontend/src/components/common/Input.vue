<template>
  <div class="w-full">
    <label v-if="label" :for="id" class="input-label mb-1.5 block">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <div class="relative">
      <!-- Prefix Icon Slot -->
      <div
        v-if="$slots.prefix"
        class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 transition-colors duration-200"
        :class="[
          focused ? 'text-primary-500' : 'text-gray-400 dark:text-dark-400',
          error ? '!text-red-500' : ''
        ]"
      >
        <slot name="prefix"></slot>
      </div>

      <!-- Error Icon (absolute left) -->
      <div
        v-if="error && showErrorIcon"
        class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5"
      >
        <Icon name="exclamationCircle" size="md" class="text-red-500" />
      </div>

      <input
        :id="id"
        ref="inputRef"
        :type="type"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        :placeholder="placeholderText"
        :autocomplete="autocomplete"
        :readonly="readonly"
        :class="[
          'input w-full transition-all duration-200',
          $slots.prefix || (error && showErrorIcon) ? 'pl-11' : '',
          $slots.suffix || (success && showSuccessIcon) ? 'pr-11' : '',
          error ? 'input-error ring-2 ring-red-500/20 border-red-500 focus:border-red-500 focus:ring-red-500/30' : '',
          success && !error ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/30' : '',
          disabled ? 'cursor-not-allowed bg-gray-100 opacity-60 dark:bg-dark-900' : '',
          'hover:border-gray-300 dark:hover:border-dark-500'
        ]"
        @input="onInput"
        @change="$emit('change', ($event.target as HTMLInputElement).value)"
        @blur="handleBlur"
        @focus="handleFocus"
        @keyup.enter="$emit('enter', $event)"
      />

      <!-- Success Icon -->
      <div
        v-if="success && showSuccessIcon && !$slots.suffix"
        class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"
      >
        <Icon name="checkCircle" size="md" class="text-emerald-500" />
      </div>

      <!-- Suffix Slot (e.g. Password Toggle or Clear Button) -->
      <div
        v-if="$slots.suffix"
        class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 dark:text-dark-400"
      >
        <slot name="suffix"></slot>
      </div>
    </div>
    <!-- Hint / Error Text with icon -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <p v-if="error" class="input-error-text mt-1.5 flex items-center gap-1">
        <Icon name="exclamationTriangle" size="xs" class="flex-shrink-0" />
        <span>{{ error }}</span>
      </p>
    </transition>
    <p v-if="!error && hint" class="input-hint mt-1.5">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from '@/components/icons/Icon.vue'

interface Props {
  modelValue: string | number | null | undefined
  type?: string
  label?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  readonly?: boolean
  error?: string
  hint?: string
  id?: string
  autocomplete?: string
  success?: boolean
  showErrorIcon?: boolean
  showSuccessIcon?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  required: false,
  readonly: false,
  success: false,
  showErrorIcon: true,
  showSuccessIcon: true
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
  (e: 'blur', event: FocusEvent): void
  (e: 'focus', event: FocusEvent): void
  (e: 'enter', event: KeyboardEvent): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const focused = ref(false)
const placeholderText = computed(() => props.placeholder || '')

const onInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
}

const handleFocus = (event: FocusEvent) => {
  focused.value = true
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  focused.value = false
  emit('blur', event)
}

// Expose focus method
defineExpose({
  focus: () => inputRef.value?.focus(),
  select: () => inputRef.value?.select()
})
</script>
