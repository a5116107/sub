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
  api_key_id?: number;
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
  user_id?: number;
  api_key_id?: number;
  account_id?: number;
  group_id?: number;
  model?: string;
}

interface BackendCleanupTask {
  id: number;
  status: string;
  filters?: {
    start_time?: string;
    end_time?: string;
  };
  deleted_rows?: number;
  error_message?: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  created_by: number;
}

const toDateOnly = (input?: string) => {
  if (!input) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
};

const buildCleanupWindow = (beforeDate: string) => {
  const endDate = toDateOnly(beforeDate) || new Date().toISOString().slice(0, 10);
  return {
    start_date: '1970-01-01',
    end_date: endDate,
  };
};

const mapCleanupTask = (task: BackendCleanupTask): CleanupTask => ({
  id: task.id,
  status: (task.status || 'pending') as CleanupTask['status'],
  before_date: toDateOnly(task.filters?.end_time) || toDateOnly(task.created_at) || '',
  dry_run: false,
  deleted_count: task.deleted_rows || 0,
  error_message: task.error_message,
  created_at: task.created_at,
  started_at: task.started_at,
  completed_at: task.finished_at,
  created_by: task.created_by,
});

export const adminUsageApi = {
  // Get all usage logs
  getLogs: (params?: AdminUsageQueryParams) =>
    api.get<PaginatedResponse<UsageLog>>('/admin/usage', {
      params: {
        ...params,
        start_date: toDateOnly(params?.start_date),
        end_date: toDateOnly(params?.end_date),
      },
    }),

  // Get usage stats
  getStats: (params?: { start_date?: string; end_date?: string }) =>
    api.get<{
      total_requests: number;
      total_tokens: number;
      total_cost: number;
      actual_cost: number;
      unique_users: number;
      unique_models: number;
    }>('/admin/usage/stats', {
      params: {
        ...params,
        start_date: toDateOnly(params?.start_date),
        end_date: toDateOnly(params?.end_date),
      },
    }),

  // Legacy compatibility: backend has no dedicated trends endpoint
  getTrends: async () => [],

  // Legacy compatibility: backend has no dedicated model stats endpoint
  getModelStats: async () => [],

  // Legacy compatibility: backend has no dedicated group stats endpoint
  getGroupStats: async () => [],

  // Get real-time stats from ops endpoint
  getRealtimeStats: async () => {
    const response = await api.get<Record<string, number>>('/admin/ops/realtime-traffic');
    return {
      requests_per_minute: Number(response?.qps || 0),
      active_requests: Number(response?.in_flight || 0),
      avg_latency_ms: Number(response?.p95_latency_ms || 0),
      error_rate: Number(response?.error_rate || 0),
    };
  },

  // Cleanup old logs (compat wrapper -> create cleanup task)
  cleanupLogs: async (data: { before_date: string; dry_run?: boolean }) => {
    const created = await adminUsageApi.createCleanupTask({
      before_date: data.before_date,
      dry_run: data.dry_run,
    });
    return {
      deleted_count: created.deleted_count || 0,
      dry_run: !!data.dry_run,
    };
  },

  // Cleanup tasks management
  getCleanupTasks: async () => {
    const response = await api.get<PaginatedResponse<BackendCleanupTask>>('/admin/usage/cleanup-tasks', {
      params: { page: 1, page_size: 200 },
    });
    return (response?.items || []).map(mapCleanupTask);
  },

  createCleanupTask: async (data: CreateCleanupTaskRequest) => {
    const dateRange = buildCleanupWindow(data.before_date);
    const task = await api.post<BackendCleanupTask>('/admin/usage/cleanup-tasks', {
      ...dateRange,
      user_id: data.user_id,
      api_key_id: data.api_key_id,
      account_id: data.account_id,
      group_id: data.group_id,
      model: data.model,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    return mapCleanupTask(task);
  },

  cancelCleanupTask: (id: number) =>
    api.post<void>(`/admin/usage/cleanup-tasks/${id}/cancel`),

  // Search users
  searchUsers: (query: string, limit = 20) =>
    api.get<Array<{
      id: number;
      email: string;
      username?: string;
    }>>('/admin/usage/search-users', { params: { q: query, limit } })
      .then((users) => (users || []).map((user) => ({
        ...user,
        username: user.username || user.email,
      }))),

  // Search API keys
  searchApiKeys: (query: string, limit = 20, userId?: number) =>
    api.get<Array<{
      id: number;
      name: string;
      user_id: number;
      username?: string;
    }>>('/admin/usage/search-api-keys', {
      params: {
        q: query,
        limit,
        user_id: userId,
      },
    }).then((keys) => (keys || []).map((key) => ({
      ...key,
      username: key.username || `User #${key.user_id}`,
    }))),
};
