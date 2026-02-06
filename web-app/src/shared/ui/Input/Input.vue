<script setup lang="ts">
import { computed, ref } from 'vue'

type InputType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search'
type InputSize = 'sm' | 'md' | 'lg'
type InputRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

interface Props {
  modelValue?: string
  type?: InputType
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  error?: string
  label?: string
  hint?: string
  id?: string
  autocomplete?: string
  autofocus?: boolean
  maxLength?: number
  minLength?: number
  pattern?: string
  step?: number | string
  min?: number | string
  max?: number | string
  size?: InputSize
  rounded?: InputRadius
  prefix?: string
  suffix?: string
  clearable?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  size: 'md',
  rounded: 'lg'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
  keydown: [event: KeyboardEvent]
  clear: []
}>()

const inputRef = ref<HTMLInputElement>()
const isFocused = ref(false)

const inputId = computed(() => props.id || `input-${Math.random().toString(36).substr(2, 9)}`)

const sizeClasses = computed(() => {
  const sizes: Record<InputSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  }
  return sizes[props.size]
})

const radiusClasses = computed(() => {
  const radii: Record<InputRadius, string> = {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  }
  return radii[props.rounded]
})

const inputClasses = computed(() => [
  'w-full bg-bg-primary border text-text-primary placeholder:text-text-tertiary',
  'transition-all duration-200 focus:outline-none focus:ring-2',
  'disabled:bg-bg-tertiary disabled:cursor-not-allowed disabled:opacity-60',
  sizeClasses.value,
  radiusClasses.value,
  props.error
    ? 'border-error focus:ring-error/20 focus:border-error'
    : 'border-border hover:border-text-tertiary focus:ring-primary-500/20 focus:border-primary-500',
  props.prefix ? 'pl-10' : '',
  props.suffix || props.clearable || props.loading ? 'pr-10' : ''
])

const hasValue = computed(() => props.modelValue && props.modelValue.length > 0)

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

function handleClear() {
  emit('update:modelValue', '')
  emit('clear')
  inputRef.value?.focus()
}

function focus() {
  inputRef.value?.focus()
}

function blur() {
  inputRef.value?.blur()
}

defineExpose({
  focus,
  blur,
  input: inputRef
})
</script>

<template>
  <div class="w-full">
    <label
      v-if="label"
      :for="inputId"
      class="block text-sm font-medium text-text-secondary mb-1.5"
    >
      {{ label }}
      <span v-if="required" class="text-error ml-0.5">*</span>
    </label>

    <div class="relative">
      <!-- Prefix -->
      <div
        v-if="prefix"
        class="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
      >
        <span class="text-sm">{{ prefix }}</span>
      </div>

      <input
        :id="inputId"
        ref="inputRef"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :autocomplete="autocomplete"
        :autofocus="autofocus"
        :maxlength="maxLength"
        :minlength="minLength"
        :pattern="pattern"
        :step="step"
        :min="min"
        :max="max"
        :class="inputClasses"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined"
        @input="handleInput"
        @blur="$emit('blur', $event)"
        @focus="isFocused = true; $emit('focus', $event)"
        @keydown="$emit('keydown', $event)"
      />

      <!-- Suffix / Clear / Loading -->
      <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
        <button
          v-if="clearable && hasValue && !disabled && !readonly"
          type="button"
          class="p-0.5 text-text-tertiary hover:text-text-primary transition-colors rounded-full"
          @click="handleClear"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <span v-if="suffix && !clearable" class="text-text-tertiary text-sm">
          {{ suffix }}
        </span>

        <div
          v-if="loading"
          class="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"
        />
      </div>
    </div>

    <p
      v-if="hint && !error"
      :id="`${inputId}-hint`"
      class="mt-1.5 text-sm text-text-tertiary"
    >
      {{ hint }}
    </p>

    <p
      v-if="error"
      :id="`${inputId}-error`"
      class="mt-1.5 text-sm text-error flex items-center gap-1"
      role="alert"
    >
      <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {{ error }}
    </p>
  </div>
</template>
