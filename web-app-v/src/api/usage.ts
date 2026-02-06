import { api } from './client';
import type {
  UsageLog,
  UsageStats,
  PaginatedResponse,
} from '../types';

export interface UsageQueryParams {
  page?: number;
  page_size?: number;
  start_date?: string;
  end_date?: string;
  model?: string;
  group_id?: number;
}

export const usageApi = {
  // Get usage logs
  getLogs: (params?: UsageQueryParams) =>
    api.get<PaginatedResponse<UsageLog>>('/user/usage', { params }),

  // Get usage stats
  getStats: (params?: { start_date?: string; end_date?: string }) =>
    api.get<UsageStats>('/user/usage/stats', { params }),

  // Get usage summary
  getSummary: () =>
    api.get<{
      today: { requests: number; tokens: number; cost: number };
      week: { requests: number; tokens: number; cost: number };
      month: { requests: number; tokens: number; cost: number };
      total: { requests: number; tokens: number; cost: number };
    }>('/user/usage/summary'),

  // Get model distribution
  getModelDistribution: (params?: { start_date?: string; end_date?: string }) =>
    api.get<Array<{
      model: string;
      requests: number;
      tokens: number;
      cost: number;
    }>>('/user/usage/models', { params }),
};
