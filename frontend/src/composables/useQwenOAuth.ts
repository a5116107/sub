import { ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { adminAPI } from '@/api/admin'
import type { Account } from '@/types'
import type { QwenDeviceFlowResult } from '@/api/admin/qwen'

export function useQwenOAuth() {
  const appStore = useAppStore()

  const deviceFlow = ref<QwenDeviceFlowResult | null>(null)
  const loading = ref(false)
  const error = ref('')

  const resetState = () => {
    deviceFlow.value = null
    loading.value = false
    error.value = ''
  }

  const startDeviceFlow = async (proxyId?: number | null): Promise<QwenDeviceFlowResult | null> => {
    loading.value = true
    error.value = ''

    try {
      const payload: { proxy_id?: number } = {}
      if (proxyId != null) payload.proxy_id = proxyId

      const result = await adminAPI.qwen.startDeviceFlow(payload)
      deviceFlow.value = result
      return result
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to start Qwen device flow'
      appStore.showError(error.value)
      return null
    } finally {
      loading.value = false
    }
  }

  const createAccountFromDeviceFlow = async (params: {
    name: string
    proxyId?: number | null
    concurrency: number
    priority: number
    groupIds: number[]
  }): Promise<Account | null> => {
    const sessionId = deviceFlow.value?.session_id || ''
    if (!sessionId) {
      error.value = 'Missing device flow session'
      appStore.showError(error.value)
      return null
    }

    loading.value = true
    error.value = ''

    try {
      const payload: {
        session_id: string
        name: string
        proxy_id?: number
        concurrency: number
        priority: number
        group_ids: number[]
      } = {
        session_id: sessionId,
        name: params.name,
        concurrency: params.concurrency,
        priority: params.priority,
        group_ids: params.groupIds
      }

      if (params.proxyId != null) payload.proxy_id = params.proxyId

      const account = await adminAPI.qwen.createFromDeviceFlow(payload)
      return account
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to create Qwen account'
      appStore.showError(error.value)
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    deviceFlow,
    loading,
    error,
    resetState,
    startDeviceFlow,
    createAccountFromDeviceFlow
  }
}

