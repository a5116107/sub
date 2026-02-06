import { ref, computed } from 'vue'
import type { ToastOptions, ToastItem, ToastPosition } from '~/shared/ui/Toast/types'

const toasts = ref<ToastItem[]>([])
const defaultPosition = ref<ToastPosition>('top-right')
const maxToasts = 5

function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function addToast(options: ToastOptions) {
  const id = generateId()
  const toast: ToastItem = {
    message: options.message,
    type: options.type || 'info',
    duration: options.duration ?? 5000,
    position: options.position || defaultPosition.value,
    closable: options.closable ?? true,
    action: options.action,
    id,
    createdAt: Date.now()
  }

  // Remove oldest toast if max reached
  if (toasts.value.length >= maxToasts) {
    toasts.value.shift()
  }

  toasts.value.push(toast)

  // Auto remove after duration
  if (toast.duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, toast.duration)
  }

  return id
}

function removeToast(id: string) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

function clearAll() {
  toasts.value = []
}

export function useToast() {
  return {
    // State
    toasts: computed(() => toasts.value),

    // Methods
    success(message: string, options?: Omit<ToastOptions, 'message' | 'type'>) {
      return addToast({ ...options, message, type: 'success' })
    },

    error(message: string, options?: Omit<ToastOptions, 'message' | 'type'>) {
      return addToast({ ...options, message, type: 'error' })
    },

    warning(message: string, options?: Omit<ToastOptions, 'message' | 'type'>) {
      return addToast({ ...options, message, type: 'warning' })
    },

    info(message: string, options?: Omit<ToastOptions, 'message' | 'type'>) {
      return addToast({ ...options, message, type: 'info' })
    },

    remove: removeToast,
    clear: clearAll,

    // Configuration
    setDefaultPosition(position: ToastPosition) {
      defaultPosition.value = position
    }
  }
}
