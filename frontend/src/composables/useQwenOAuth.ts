import { ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { adminAPI } from '@/api/admin'
import type { QwenDeviceFlowResult, QwenTokenInfo } from '@/api/admin/qwen'

export function useQwenOAuth() {
  const appStore = useAppStore()

  const deviceFlow = ref<QwenDeviceFlowResult | null>(null)
  const tokenInfo = ref<QwenTokenInfo | null>(null)
  const loading = ref(false)
  const error = ref('')

  const resetState = () => {
    deviceFlow.value = null
    tokenInfo.value = null
    loading.value = false
    error.value = ''
  }

  const extractErrorMessage = (err: any, fallback: string) => {
    return (
      err?.message ||
      err?.response?.data?.message ||
      err?.response?.data?.detail ||
      fallback
    )
  }

  const isAuthorizationPending = (message: string) => {
    const m = (message || '').toLowerCase()
    return m.includes('authorization_pending') || m.includes('slow_down')
  }

  const startDeviceFlow = async (proxyId?: number | null): Promise<QwenDeviceFlowResult | null> => {
    loading.value = true
    error.value = ''
    tokenInfo.value = null

    try {
      const payload: { proxy_id?: number } = {}
      if (proxyId != null) payload.proxy_id = proxyId

      const result = await adminAPI.qwen.startDeviceFlow(payload)
      deviceFlow.value = result
      return result
    } catch (err: any) {
      error.value = extractErrorMessage(err, 'Failed to start Qwen device flow')
      appStore.showError(error.value)
      return null
    } finally {
      loading.value = false
    }
  }

  const pollDeviceFlowTokenOnce = async (): Promise<QwenTokenInfo | null> => {
    const sessionId = deviceFlow.value?.session_id || ''
    if (!sessionId) return null
    loading.value = true
    error.value = ''

    try {
      const info = await adminAPI.qwen.pollDeviceFlowToken({ session_id: sessionId })
      tokenInfo.value = info
      return info
    } catch (err: any) {
      const message = extractErrorMessage(err, 'Failed to poll Qwen device flow token')
      // Qwen device flow typically returns authorization_pending until user confirms in browser.
      // Treat it as a non-fatal state: show inline message but avoid spamming global toasts.
      if (isAuthorizationPending(message)) {
        error.value = 'Waiting for authorization. Complete the flow in browser, then try again.'
      } else {
        error.value = message
        appStore.showError(error.value)
      }
      return null
    } finally {
      loading.value = false
    }
  }

  const buildCredentials = (info: QwenTokenInfo): Record<string, unknown> => {
    const creds: Record<string, unknown> = {
      access_token: info.access_token,
      token_type: info.token_type,
      expires_at: info.expires_at
    }
    if (info.refresh_token) creds.refresh_token = info.refresh_token
    if (info.resource_url) {
      creds.resource_url = info.resource_url
      const host = String(info.resource_url).trim()
      if (host) creds.base_url = `https://${host}/v1`
    }
    return creds
  }

  return {
    deviceFlow,
    tokenInfo,
    loading,
    error,
    resetState,
    startDeviceFlow,
    pollDeviceFlowTokenOnce,
    buildCredentials
  }
}

