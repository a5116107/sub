// Form composable with validation support
import { ref, computed, type Ref } from 'vue'
import type { ZodSchema } from 'zod'

interface UseFormOptions<T> {
  initialValues: T
  schema?: ZodSchema
  onSubmit?: (values: T) => Promise<void> | void
}

interface UseFormReturn<T> {
  values: Ref<T>
  errors: Ref<Record<string, string>>
  touched: Ref<Record<string, boolean>>
  isSubmitting: Ref<boolean>
  isValid: Ref<boolean>
  setValue: (field: keyof T, value: any) => void
  setValues: (newValues: Partial<T>) => void
  setError: (field: string, message: string) => void
  clearError: (field: string) => void
  touch: (field: string) => void
  handleSubmit: (e?: Event) => Promise<void>
  reset: () => void
}

export function useForm<T extends Record<string, any>>(
  options: UseFormOptions<T>
): UseFormReturn<T> {
  const { initialValues, schema, onSubmit } = options

  const values = ref<T>({ ...initialValues }) as Ref<T>
  const errors = ref<Record<string, string>>({})
  const touched = ref<Record<string, boolean>>({})
  const isSubmitting = ref(false)

  const isValid = computed(() => {
    if (!schema) return true
    const result = schema.safeParse(values.value)
    return result.success
  })

  function setValue(field: keyof T, value: any) {
    values.value[field] = value
    if (touched.value[field as string]) {
      validateField(field as string)
    }
  }

  function setValues(newValues: Partial<T>) {
    Object.keys(newValues).forEach((key) => {
      const field = key as keyof T
      values.value[field] = newValues[field] as any
      touched.value[key] = true
    })
    // 重新验证所有字段
    if (schema) {
      validateAll()
    }
  }

  function setError(field: string, message: string) {
    errors.value[field] = message
  }

  function clearError(field: string) {
    delete errors.value[field]
  }

  function touch(field: string) {
    touched.value[field] = true
    validateField(field)
  }

  function validateField(field: string): boolean {
    if (!schema) return true

    const result = schema.safeParse(values.value)
    if (!result.success) {
      const fieldError = result.error.errors.find(e => e.path[0] === field)
      if (fieldError) {
        errors.value[field] = fieldError.message
        return false
      }
    }
    clearError(field)
    return true
  }

  function validateAll(): boolean {
    if (!schema) return true

    const result = schema.safeParse(values.value)
    if (!result.success) {
      errors.value = {}
      result.error.errors.forEach(err => {
        const field = err.path[0] as string
        if (!errors.value[field]) {
          errors.value[field] = err.message
        }
      })
      return false
    }
    errors.value = {}
    return true
  }

  async function handleSubmit(e?: Event) {
    if (e) {
      e.preventDefault()
    }

    // Touch all fields
    Object.keys(values.value).forEach(key => {
      touched.value[key] = true
    })

    if (!validateAll()) {
      return
    }

    if (onSubmit) {
      isSubmitting.value = true
      try {
        await onSubmit(values.value)
      } finally {
        isSubmitting.value = false
      }
    }
  }

  function reset() {
    values.value = { ...initialValues }
    errors.value = {}
    touched.value = {}
    isSubmitting.value = false
  }

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    setValue,
    setValues,
    setError,
    clearError,
    touch,
    handleSubmit,
    reset
  }
}
