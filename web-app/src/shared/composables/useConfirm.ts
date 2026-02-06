// Confirm dialog composable
import { ref } from 'vue'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void
  reject: () => void
}

const currentConfirm = ref<ConfirmState | null>(null)

export function useConfirm() {
  function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve, reject) => {
      currentConfirm.value = {
        ...options,
        resolve,
        reject
      }
    })
  }

  function handleConfirm() {
    if (currentConfirm.value) {
      currentConfirm.value.resolve(true)
      currentConfirm.value = null
    }
  }

  function handleCancel() {
    if (currentConfirm.value) {
      currentConfirm.value.resolve(false)
      currentConfirm.value = null
    }
  }

  return {
    currentConfirm,
    confirm,
    handleConfirm,
    handleCancel
  }
}
