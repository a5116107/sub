import { api } from '../client';
import type {
  UsageLog,
  PaginatedResponse,
} from '../../types';

export interface AdminUsageQueryParams {
  page?: number;
  page_size?: number;
  start_date?: string;
  end_date?: string;
  user_id?: number;
  account_id?: number;
  group_id?: number;
  model?: string;
  request_id?: string;
}

export interface CleanupTask {
  id: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  before_date: string;
  dry_run: boolean;
  deleted_count: number;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  created_by: number;
}

export interface CreateCleanupTaskRequest {
  before_date: string;
  dry_run?: boolean;
}

export const adminUsageApi = {
  // Get all usage logs
  getLogs: (params?: AdminUsageQueryParams) =>
    api.get<PaginatedResponse<UsageLog>>('/admin/usage', { params }),

  // Get usage stats
  getStats: (params?: { start_date?: string; end_date?: string }) =>
    api.get<{
      total_requests: number;
      total_tokens: number;
      total_cost: number;
      actual_cost: number;
      unique_users: number;
      unique_models: number;
    }>('/admin/usage/stats', { params }),

  // Get usage trends
  getTrends: (params?: { days?: number; group_by?: string }) =>
    api.get<Array<{
      date: string;
      requests: number;
      tokens: number;
      cost: number;
      users: number;
    }>>('/admin/usage/trends', { params }),

  // Get model usage stats
  getModelStats: (params?: { start_date?: string; end_date?: string }) =>
    api.get<Array<{
      model: string;
      requests: number;
      input_tokens: number;
      output_tokens: number;
      cost: number;
    }>>('/admin/usage/models', { params }),

  // Get group usage stats
  getGroupStats: (params?: { start_date?: string; end_date?: string }) =>
    api.get<Array<{
      group_id: number;
      group_name: string;
      requests: number;
      tokens: number;
      cost: number;
    }>>('/admin/usage/groups', { params }),

  // Get real-time stats
  getRealtimeStats: () =>
    api.get<{
      requests_per_minute: number;
      active_requests: number;
      avg_latency_ms: number;
      error_rate: number;
    }>('/admin/usage/realtime'),

  // Cleanup old logs (legacy direct cleanup)
  cleanupLogs: (data: { before_date: string; dry_run?: boolean }) =>
    api.post<{
      deleted_count: number;
      dry_run: boolean;
    }>('/admin/usage/cleanup', data),

  // Cleanup tasks management
  getCleanupTasks: () =>
    api.get<CleanupTask[]>('/admin/usage/cleanup-tasks'),

  createCleanupTask: (data: CreateCleanupTaskRequest) =>
    api.post<CleanupTask>('/admin/usage/cleanup-tasks', data),

  cancelCleanupTask: (id: number) =>
    api.post<void>(`/admin/usage/cleanup-tasks/${id}/cancel`),
};
