export { default as StepForm } from './StepForm.vue'
export { default as FormSection } from './FormSection.vue'
export { default as FormField } from './FormField.vue'

// Re-export Step interface
export interface Step {
  title: string
  description?: string
  optional?: boolean
  validate?: () => boolean | Promise<boolean>
}
