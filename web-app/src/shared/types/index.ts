// Global type definitions

export interface ApiResponse<T> {
  code: number
  data: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface PaginationInfo {
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface PaginationParams {
  page?: number
  page_size?: number
}

export type Status = 'active' | 'inactive' | 'disabled' | 'pending'

export interface SelectOption<T = string> {
  label: string
  value: T
  disabled?: boolean
}

// Re-export PublicSettings from api/types for convenience
export type { PublicSettings } from '../api/types'

// Global window extensions
declare global {
  interface Window {
    __APP_CONFIG__?: import('../api/types').PublicSettings
  }
}
