export type ToastType = 'success' | 'error' | 'warning' | 'info'
export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'

export interface ToastOptions {
  message: string
  type?: ToastType
  duration?: number
  position?: ToastPosition
  closable?: boolean
  action?: {
    label: string
    callback: () => void
  }
}

export interface ToastItem extends Omit<Required<ToastOptions>, 'action'> {
  id: string
  createdAt: number
  action?: ToastOptions['action']
}

export interface ToastState {
  toasts: ToastItem[]
  position: ToastPosition
  maxToasts: number
  pauseOnHover: boolean
}
