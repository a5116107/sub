<template>
  <div class="step-form">
    <!-- Step Indicator -->
    <div class="step-indicator mb-6">
      <div class="flex items-center justify-between">
        <template v-for="(step, index) in steps" :key="index">
          <!-- Step Circle -->
          <div class="flex flex-col items-center">
            <button
              type="button"
              @click="goToStep(index)"
              :disabled="!canNavigateToStep(index)"
              :class="[
                'relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300',
                currentStep === index
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 ring-4 ring-primary-500/20'
                  : completedSteps.includes(index)
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-200 text-gray-500 dark:bg-dark-700 dark:text-dark-400',
                canNavigateToStep(index) ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'
              ]"
            >
              <Icon v-if="completedSteps.includes(index) && currentStep !== index" name="check" size="sm" />
              <span v-else>{{ index + 1 }}</span>
            </button>
            <span
              :class="[
                'mt-2 text-xs font-medium transition-colors',
                currentStep === index
                  ? 'text-primary-600 dark:text-primary-400'
                  : completedSteps.includes(index)
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-500 dark:text-dark-400'
              ]"
            >
              {{ step.title }}
            </span>
          </div>

          <!-- Connector Line -->
          <div
            v-if="index < steps.length - 1"
            :class="[
              'mx-2 h-0.5 flex-1 transition-colors duration-300',
              completedSteps.includes(index)
                ? 'bg-emerald-500'
                : 'bg-gray-200 dark:bg-dark-700'
            ]"
          />
        </template>
      </div>
    </div>

    <!-- Step Content -->
    <div class="step-content">
      <TransitionGroup
        :name="transitionName"
        tag="div"
        class="relative"
      >
        <div
          v-for="(step, index) in steps"
          v-show="currentStep === index"
          :key="index"
          class="step-panel"
        >
          <div v-if="step.description" class="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {{ step.description }}
          </div>
          <slot :name="`step-${index}`" :step="step" :index="index" />
        </div>
      </TransitionGroup>
    </div>

    <!-- Navigation Buttons -->
    <div class="step-navigation mt-6 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-dark-700">
      <button
        v-if="currentStep > 0"
        type="button"
        @click="prevStep"
        class="btn btn-secondary"
      >
        <Icon name="chevronLeft" size="sm" class="mr-1" />
        {{ prevLabel || t('common.previous') }}
      </button>
      <div v-else />

      <div class="flex items-center gap-3">
        <button
          v-if="showSkip && currentStep < steps.length - 1 && steps[currentStep]?.optional"
          type="button"
          @click="skipStep"
          class="btn btn-ghost text-gray-500"
        >
          {{ skipLabel || t('common.skip') }}
        </button>

        <button
          v-if="currentStep < steps.length - 1"
          type="button"
          @click="nextStep"
          :disabled="!canProceed"
          class="btn btn-primary"
        >
          {{ nextLabel || t('common.next') }}
          <Icon name="chevronRight" size="sm" class="ml-1" />
        </button>

        <button
          v-else
          type="submit"
          :disabled="!canSubmit || submitting"
          class="btn btn-primary"
        >
          <span v-if="submitting" class="mr-2">
            <Icon name="refresh" size="sm" class="animate-spin" />
          </span>
          {{ submitLabel || t('common.submit') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'

export interface Step {
  title: string
  description?: string
  optional?: boolean
  validate?: () => boolean | Promise<boolean>
}

interface Props {
  steps: Step[]
  modelValue?: number
  canProceed?: boolean
  canSubmit?: boolean
  submitting?: boolean
  showSkip?: boolean
  prevLabel?: string
  nextLabel?: string
  skipLabel?: string
  submitLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
  canProceed: true,
  canSubmit: true,
  submitting: false,
  showSkip: true
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
  'step-change': [from: number, to: number]
  'step-complete': [index: number]
  'submit': []
}>()

const { t } = useI18n()

const currentStep = ref(props.modelValue)
const completedSteps = ref<number[]>([])
const transitionName = ref('slide-left')

watch(() => props.modelValue, (newVal) => {
  if (newVal !== currentStep.value) {
    currentStep.value = newVal
  }
})

const canNavigateToStep = (index: number): boolean => {
  // Can always go back to completed steps
  if (completedSteps.value.includes(index)) return true
  // Can go to current step
  if (index === currentStep.value) return true
  // Can go to next step if current is completed
  if (index === currentStep.value + 1 && props.canProceed) return true
  return false
}

const goToStep = (index: number) => {
  if (!canNavigateToStep(index)) return

  const from = currentStep.value
  transitionName.value = index > from ? 'slide-left' : 'slide-right'
  currentStep.value = index
  emit('update:modelValue', index)
  emit('step-change', from, index)
}

const nextStep = async () => {
  const step = props.steps[currentStep.value]

  // Validate current step if validator exists
  if (step?.validate) {
    const isValid = await step.validate()
    if (!isValid) return
  }

  if (!props.canProceed) return

  // Mark current step as completed
  if (!completedSteps.value.includes(currentStep.value)) {
    completedSteps.value.push(currentStep.value)
    emit('step-complete', currentStep.value)
  }

  if (currentStep.value < props.steps.length - 1) {
    goToStep(currentStep.value + 1)
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    goToStep(currentStep.value - 1)
  }
}

const skipStep = () => {
  if (currentStep.value < props.steps.length - 1) {
    goToStep(currentStep.value + 1)
  }
}

// Expose methods for parent component
defineExpose({
  currentStep,
  completedSteps,
  goToStep,
  nextStep,
  prevStep,
  reset: () => {
    currentStep.value = 0
    completedSteps.value = []
    emit('update:modelValue', 0)
  }
})
</script>

<style scoped>
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease-out;
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.step-panel {
  width: 100%;
}
</style>
