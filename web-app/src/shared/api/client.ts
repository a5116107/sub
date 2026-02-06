import axios, { type AxiosError, type AxiosResponse } from 'axios'
import { API_BASE_URL, API_TIMEOUT, STORAGE_KEYS } from '~/shared/config/constants'
import type { ApiResponse } from '~/shared/types'
import { useAuthStore } from '~/app/stores'

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
apiClient.interceptors.request.use(
  config => {
    // Add auth token
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add locale
    const locale = localStorage.getItem(STORAGE_KEYS.LOCALE) || 'zh'
    config.headers['Accept-Language'] = locale

    return config
  },
  error => Promise.reject(error)
)

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<any>>) => {
    // Return data directly if successful; otherwise reject so callers can handle it.
    if (response.data && response.data.code === 0) {
      return response.data.data
    }

    const data = response.data as any
    const apiError = new Error(data?.message || 'API Error') as Error & {
      code?: number
      error?: string
      httpStatus?: number
    }
    apiError.code = data?.code
    apiError.error = data?.error
    apiError.httpStatus = response.status
    return Promise.reject(apiError)
  },
  (error: AxiosError<ApiResponse<any>>) => {
    const response = error.response

    if (response) {
      // Handle 401 Unauthorized
      if (response.status === 401) {
        localStorage.removeItem(STORAGE_KEYS.TOKEN)
        try {
          useAuthStore().clearAuth()
        } catch {
          // ignore if pinia not ready in this context
        }
        window.location.href = '/login'
        return Promise.reject(error)
      }

      // Handle other errors
      const errorMessage = response.data?.message || 'An error occurred'
      const errorCode = response.data?.error || 'UNKNOWN_ERROR'

      console.error(`API Error [${errorCode}]:`, errorMessage)
    }

    return Promise.reject(error)
  }
)

// Typed request helpers
export async function get<T>(url: string, params?: Record<string, any>): Promise<T> {
  return apiClient.get(url, { params })
}

export async function post<T>(url: string, data?: any): Promise<T> {
  return apiClient.post(url, data)
}

export async function put<T>(url: string, data?: any): Promise<T> {
  return apiClient.put(url, data)
}

export async function patch<T>(url: string, data?: any): Promise<T> {
  return apiClient.patch(url, data)
}

export async function del<T>(url: string): Promise<T> {
  return apiClient.delete(url)
}

export default apiClient
