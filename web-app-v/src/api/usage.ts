import { api } from './client';
import type {
  UsageLog,
  UsageStats,
  PaginatedResponse,
  DashboardStats,
  DashboardTrendPoint,
  DashboardModelStat,
  DashboardApiKeyUsage,
} from '../types';

export interface UsageQueryParams {
  page?: number;
  page_size?: number;
  start_date?: string;
  end_date?: string;
  model?: string;
  group_id?: number;
  api_key_id?: number;
  stream?: boolean;
  billing_type?: number;
  timezone?: string;
}

export const usageApi = {
  // Get usage logs
  getLogs: (params?: UsageQueryParams) =>
    api.get<PaginatedResponse<UsageLog>>('/usage', { params }),

  // Get usage stats
  getStats: (params?: { start_date?: string; end_date?: string }) =>
    api.get<UsageStats>('/usage/stats', { params }),

  // Get usage by ID
  getById: (id: number) =>
    api.get<UsageLog>(`/usage/${id}`),

  // Dashboard API endpoints
  // Get dashboard stats
  getDashboardStats: (params?: { granularity?: string }) =>
    api.get<DashboardStats>('/usage/dashboard/stats', { params }),

  // Get dashboard trend (response is wrapped: { trend: [...], start_date, end_date, granularity })
  getDashboardTrend: (params?: { granularity?: string; start_date?: string; end_date?: string }) =>
    api.get<{ trend: DashboardTrendPoint[]; start_date: string; end_date: string; granularity: string }>('/usage/dashboard/trend', { params })
      .then(res => res.trend || []),

  // Get dashboard models (response is wrapped: { models: [...], start_date, end_date })
  getDashboardModels: (params?: { start_date?: string; end_date?: string }) =>
    api.get<{ models: DashboardModelStat[]; start_date: string; end_date: string }>('/usage/dashboard/models', { params })
      .then(res => res.models || []),

  // Get API keys usage for dashboard
  getDashboardApiKeysUsage: (data: {
    api_key_ids?: number[];
    start_date?: string;
    end_date?: string;
  }) =>
    api.post<DashboardApiKeyUsage[]>('/usage/dashboard/api-keys-usage', data),
};
