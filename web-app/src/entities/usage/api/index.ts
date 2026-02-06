// Usage API functions
import { useQuery } from '@tanstack/vue-query'
import { get, post } from '~/shared/api/client'
import type {
  UsageLog,
  UsageStats,
  UsageTrend,
  ModelUsage,
  APIKeyUsage,
  DashboardStats,
  UsageQueryParams,
  UsageStatsParams,
  DashboardTrendParams,
  BatchAPIKeysUsageRequest
} from '../model/types'
import type { PaginatedResponse } from '~/shared/types'

// Query Keys
const USAGE_KEYS = {
  all: ['usage'] as const,
  list: (params?: UsageQueryParams) => [...USAGE_KEYS.all, 'list', params] as const,
  stats: (params?: UsageStatsParams) => [...USAGE_KEYS.all, 'stats', params] as const,
  dashboard: {
    stats: () => [...USAGE_KEYS.all, 'dashboard', 'stats'] as const,
    trend: (params?: DashboardTrendParams) => [...USAGE_KEYS.all, 'dashboard', 'trend', params] as const,
    models: (params?: { start_date?: string; end_date?: string }) =>
      [...USAGE_KEYS.all, 'dashboard', 'models', params] as const,
    apiKeysUsage: () => [...USAGE_KEYS.all, 'dashboard', 'api-keys-usage'] as const
  }
}

// API functions
export const usageApi = {
  list: (params?: UsageQueryParams) =>
    get<PaginatedResponse<UsageLog>>('/usage', params),
  get: (id: number) => get<UsageLog>(`/usage/${id}`),
  stats: (params?: UsageStatsParams) =>
    get<UsageStats>('/usage/stats', params),

  // Dashboard
  dashboardStats: () => get<DashboardStats>('/usage/dashboard/stats'),
  dashboardTrend: (params?: DashboardTrendParams) =>
    get<UsageTrend[]>('/usage/dashboard/trend', params),
  dashboardModels: (params?: { start_date?: string; end_date?: string }) =>
    get<ModelUsage[]>('/usage/dashboard/models', params),
  batchApiKeysUsage: (data: BatchAPIKeysUsageRequest) =>
    post<APIKeyUsage[]>('/usage/dashboard/api-keys-usage', data)
}

// Composables
export function useUsageQuery(params?: UsageQueryParams) {
  return useQuery({
    queryKey: USAGE_KEYS.list(params),
    queryFn: () => usageApi.list(params)
  })
}

export function useUsageStatsQuery(params?: UsageStatsParams) {
  return useQuery({
    queryKey: USAGE_KEYS.stats(params),
    queryFn: () => usageApi.stats(params)
  })
}

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: USAGE_KEYS.dashboard.stats(),
    queryFn: () => usageApi.dashboardStats()
  })
}

export function useDashboardTrendQuery(params?: DashboardTrendParams) {
  return useQuery({
    queryKey: USAGE_KEYS.dashboard.trend(params),
    queryFn: () => usageApi.dashboardTrend(params)
  })
}

export function useDashboardModelsQuery(params?: { start_date?: string; end_date?: string }) {
  return useQuery({
    queryKey: USAGE_KEYS.dashboard.models(params),
    queryFn: () => usageApi.dashboardModels(params)
  })
}
