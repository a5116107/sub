<template>
  <div :class="['form-section', { 'form-section-collapsible': collapsible }]">
    <!-- Section Header -->
    <div
      v-if="title || $slots.header"
      :class="[
        'form-section-header',
        collapsible ? 'cursor-pointer select-none' : ''
      ]"
      @click="collapsible && toggle()"
    >
      <slot name="header">
        <div class="flex items-center gap-3">
          <div
            v-if="icon"
            :class="[
              'flex h-8 w-8 items-center justify-center rounded-lg',
              iconBgClass
            ]"
          >
            <Icon :name="icon" size="sm" :class="iconClass" />
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ title }}
              <span v-if="optional" class="ml-1 text-xs font-normal text-gray-400 dark:text-dark-500">
                ({{ t('common.optional') }})
              </span>
            </h3>
            <p v-if="description" class="mt-0.5 text-xs text-gray-500 dark:text-dark-400">
              {{ description }}
            </p>
          </div>
          <Icon
            v-if="collapsible"
            name="chevronDown"
            size="sm"
            :class="[
              'text-gray-400 transition-transform duration-200',
              isExpanded ? 'rotate-180' : ''
            ]"
          />
        </div>
      </slot>
    </div>

    <!-- Section Content -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[2000px]"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 max-h-[2000px]"
      leave-to-class="opacity-0 max-h-0"
    >
      <div v-show="!collapsible || isExpanded" class="form-section-content overflow-hidden">
        <div :class="['space-y-4', title ? 'pt-4' : '']">
          <slot />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon, { type IconName } from '@/components/icons/Icon.vue'

interface Props {
  title?: string
  description?: string
  icon?: IconName
  iconVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'gray'
  optional?: boolean
  collapsible?: boolean
  defaultExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  iconVariant: 'primary',
  collapsible: false,
  defaultExpanded: true
})

const emit = defineEmits<{
  'toggle': [expanded: boolean]
}>()

const { t } = useI18n()

const isExpanded = ref(props.defaultExpanded)

const iconBgClass = {
  primary: 'bg-primary-100 dark:bg-primary-900/30',
  success: 'bg-emerald-100 dark:bg-emerald-900/30',
  warning: 'bg-amber-100 dark:bg-amber-900/30',
  danger: 'bg-red-100 dark:bg-red-900/30',
  gray: 'bg-gray-100 dark:bg-dark-700'
}[props.iconVariant]

const iconClass = {
  primary: 'text-primary-600 dark:text-primary-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
  gray: 'text-gray-600 dark:text-gray-400'
}[props.iconVariant]

const toggle = () => {
  isExpanded.value = !isExpanded.value
  emit('toggle', isExpanded.value)
}

watch(() => props.defaultExpanded, (val) => {
  isExpanded.value = val
})

defineExpose({
  isExpanded,
  toggle,
  expand: () => { isExpanded.value = true },
  collapse: () => { isExpanded.value = false }
})
</script>

<style scoped>
.form-section {
  @apply rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-800/60;
}

.form-section-collapsible .form-section-header:hover {
  @apply bg-gray-100/50 dark:bg-dark-700/50;
  @apply -mx-4 -mt-4 px-4 pt-4 pb-4 rounded-t-xl;
}
</style>
