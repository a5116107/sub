import { api } from '../client';
import type {
  AdminDashboardStats,
  SystemSettings,
  PaginatedResponse,
} from '../../types';

export * from './users';
export * from './groups';
export * from './accounts';
export * from './redeem';
export * from './promo';
export * from './proxies';
export * from './usage';
export * from './system';
export * from './subscriptions';
export * from './modelPricing';
export * from './announcements';
export * from './userAttributes';
export * from './oauth';

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? value as Record<string, unknown> : {};

export const adminApi = {
  // Get admin dashboard stats
  getDashboardStats: async () => {
    const response = await api.get<Record<string, unknown>>('/admin/dashboard/stats');
    const errorAccounts = toNumber(response.error_accounts);
    return {
      total_users: toNumber(response.total_users),
      total_accounts: toNumber(response.total_accounts),
      total_requests_today: toNumber(response.total_requests_today ?? response.today_requests),
      total_cost_today: toNumber(response.total_cost_today ?? response.today_cost ?? response.today_actual_cost),
      active_subscriptions: toNumber(response.active_subscriptions ?? response.active_users),
      system_status: typeof response.system_status === 'string'
        ? response.system_status
        : (errorAccounts > 0 ? 'degraded' : 'healthy'),
    } satisfies AdminDashboardStats;
  },

  // Get admin dashboard trends
  getDashboardTrends: async (params?: { days?: number }) => {
    const response = await api.get<{
      trend?: Array<Record<string, unknown>>;
    } | Array<Record<string, unknown>>>('/admin/dashboard/trend', { params });
    const trend = Array.isArray(response) ? response : (response?.trend || []);
    return trend.map((item) => ({
      date: String(item.date ?? item.timestamp ?? ''),
      requests: toNumber(item.requests),
      cost: toNumber(item.cost ?? item.actual_cost),
      new_users: toNumber(item.new_users),
    }));
  },

  // Get admin dashboard realtime metrics
  getDashboardRealtime: async (params?: {
    account_id?: number;
    api_key_id?: number;
    billing_type?: string;
    granularity?: string;
    group_id?: number;
    limit?: number;
    model?: string;
    stream?: boolean;
    user_id?: number;
  }) => {
    const response = await api.get<Record<string, unknown>>('/admin/dashboard/realtime', { params });
    const requestsPerMinute = toNumber(response.requests_per_minute);
    return {
      current_qps: toNumber(response.current_qps, requestsPerMinute / 60),
      current_latency_ms: toNumber(response.current_latency_ms ?? response.average_response_time),
      active_requests: toNumber(response.active_requests),
      error_rate: toNumber(response.error_rate),
    };
  },

  // Get users trend
  getUsersTrend: async (params?: { granularity?: string; limit?: number }) => {
    const response = await api.get<{
      trend?: Array<Record<string, unknown>>;
    } | Array<Record<string, unknown>>>('/admin/dashboard/users-trend', { params });
    const trend = Array.isArray(response) ? response : (response?.trend || []);
    return trend.map((item) => ({
      timestamp: String(item.timestamp ?? item.date ?? ''),
      total_users: toNumber(item.total_users),
      new_users: toNumber(item.new_users),
      active_users: toNumber(item.active_users, toNumber(item.requests) > 0 ? 1 : 0),
    }));
  },

  // Get API keys trend
  getApiKeysTrend: async (params?: { granularity?: string; limit?: number }) => {
    const response = await api.get<{
      trend?: Array<Record<string, unknown>>;
    } | Array<Record<string, unknown>>>('/admin/dashboard/api-keys-trend', { params });
    const trend = Array.isArray(response) ? response : (response?.trend || []);
    return trend.map((item) => ({
      timestamp: String(item.timestamp ?? item.date ?? ''),
      total_keys: toNumber(item.total_keys),
      new_keys: toNumber(item.new_keys),
      active_keys: toNumber(item.active_keys, toNumber(item.requests) > 0 ? 1 : 0),
    }));
  },

  // Get batch users usage
  getBatchUsersUsage: async (data: {
    user_ids?: number[];
    start_date?: string;
    end_date?: string;
  }) => {
    const payload = {
      user_ids: data.user_ids || [],
      ...(data.start_date ? { start_date: data.start_date } : {}),
      ...(data.end_date ? { end_date: data.end_date } : {}),
    };
    const response = await api.post<{
      stats?: Record<string, Record<string, unknown>>;
    } | Array<Record<string, unknown>>>('/admin/dashboard/users-usage', payload);
    if (Array.isArray(response)) {
      return response.map((item) => {
        const record = toRecord(item);
        const userId = toNumber(record.user_id);
        return {
          user_id: userId,
          username: String(record.username ?? record.email ?? `User #${userId || '-'}`),
          total_requests: toNumber(record.total_requests),
          total_cost: toNumber(record.total_cost ?? record.total_actual_cost),
          total_tokens: toNumber(record.total_tokens),
        };
      });
    }
    const stats = toRecord(response.stats);
    return Object.entries(stats).map(([userId, stat]) => {
      const record = toRecord(stat);
      const mappedUserId = toNumber(record.user_id, toNumber(userId));
      return {
        user_id: mappedUserId,
        username: String(record.username ?? record.email ?? `User #${mappedUserId || userId}`),
        total_requests: toNumber(record.total_requests),
        total_cost: toNumber(record.total_cost ?? record.total_actual_cost),
        total_tokens: toNumber(record.total_tokens),
      };
    });
  },

  // Get batch API keys usage
  getBatchApiKeysUsage: async (data: {
    api_key_ids?: number[];
    start_date?: string;
    end_date?: string;
  }) => {
    const payload = {
      api_key_ids: data.api_key_ids || [],
      ...(data.start_date ? { start_date: data.start_date } : {}),
      ...(data.end_date ? { end_date: data.end_date } : {}),
    };
    const response = await api.post<{
      stats?: Record<string, Record<string, unknown>>;
    } | Array<Record<string, unknown>>>('/admin/dashboard/api-keys-usage', payload);
    if (Array.isArray(response)) {
      return response.map((item) => {
        const record = toRecord(item);
        const apiKeyId = toNumber(record.api_key_id);
        return {
          api_key_id: apiKeyId,
          api_key_name: String(record.api_key_name ?? record.key_name ?? `API Key #${apiKeyId || '-'}`),
          user_id: toNumber(record.user_id),
          total_requests: toNumber(record.total_requests),
          total_cost: toNumber(record.total_cost ?? record.total_actual_cost),
          total_tokens: toNumber(record.total_tokens),
        };
      });
    }
    const stats = toRecord(response.stats);
    return Object.entries(stats).map(([apiKeyId, stat]) => {
      const record = toRecord(stat);
      const mappedApiKeyId = toNumber(record.api_key_id, toNumber(apiKeyId));
      return {
        api_key_id: mappedApiKeyId,
        api_key_name: String(record.api_key_name ?? record.key_name ?? `API Key #${mappedApiKeyId || apiKeyId}`),
        user_id: toNumber(record.user_id),
        total_requests: toNumber(record.total_requests),
        total_cost: toNumber(record.total_cost ?? record.total_actual_cost),
        total_tokens: toNumber(record.total_tokens),
      };
    });
  },

  // Get dashboard models
  getDashboardModels: async (params?: {
    account_id?: number;
    api_key_id?: number;
    billing_type?: string;
    granularity?: string;
    group_id?: number;
    limit?: number;
    stream?: boolean;
    user_id?: number;
  }) => {
    const response = await api.get<{
      models?: Array<Record<string, unknown>>;
    } | Array<Record<string, unknown>>>('/admin/dashboard/models', { params });
    const models = Array.isArray(response) ? response : (response?.models || []);
    return models.map((item) => ({
      model: String(item.model ?? ''),
      requests: toNumber(item.requests),
      tokens: toNumber(item.tokens ?? item.total_tokens),
      cost: toNumber(item.cost ?? item.actual_cost),
    }));
  },

  // Backfill aggregation data
  backfillAggregation: async (params?: {
    start?: string;
    end?: string;
    account_id?: number;
    api_key_id?: number;
    billing_type?: string;
    granularity?: string;
    group_id?: number;
    model?: string;
    stream?: boolean;
    user_id?: number;
  }) => {
    const now = new Date();
    const start = params?.start || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const end = params?.end || now.toISOString();
    const response = await api.post<{ backfilled_count?: number; status?: string }>(
      '/admin/dashboard/aggregation/backfill',
      { start, end }
    );
    return {
      backfilled_count: toNumber(response.backfilled_count),
    };
  },

  // Get system settings
  getSettings: () =>
    api.get<SystemSettings>('/admin/settings'),

  // Update system settings
  updateSettings: (data: Partial<SystemSettings>) =>
    api.put<SystemSettings>('/admin/settings', data),

  // Test SMTP
  testSMTP: (data: { to: string }) =>
    api.post<void>('/admin/settings/test-smtp', data),

  // Send test email
  sendTestEmail: (data: { to: string }) =>
    api.post<void>('/admin/settings/send-test-email', data),

  // Get stream timeout settings
  getStreamTimeout: () =>
    api.get<{
      stream_timeout_seconds: number;
      idle_timeout_seconds: number;
      max_timeout_seconds: number;
    }>('/admin/settings/stream-timeout'),

  // Update stream timeout settings
  updateStreamTimeout: (data: {
    stream_timeout_seconds?: number;
    idle_timeout_seconds?: number;
    max_timeout_seconds?: number;
  }) =>
    api.put<{
      stream_timeout_seconds: number;
      idle_timeout_seconds: number;
      max_timeout_seconds: number;
    }>('/admin/settings/stream-timeout', data),

  // Get admin API key
  getAdminApiKey: () =>
    api.get<{
      key?: string;
      created_at?: string;
      last_used_at?: string;
    }>('/admin/settings/admin-api-key'),

  // Regenerate admin API key
  regenerateAdminApiKey: () =>
    api.post<{
      key: string;
      created_at: string;
    }>('/admin/settings/admin-api-key/regenerate'),

  // Delete admin API key
  deleteAdminApiKey: () =>
    api.delete<void>('/admin/settings/admin-api-key'),

  // Get admin audit logs
  getAuditLogs: async (params?: { page?: number; page_size?: number }) => {
    const response = await api.get<PaginatedResponse<Record<string, unknown>>>('/admin/ops/requests', { params });
    return {
      ...response,
      items: (response?.items || []).map((item) => ({
        id: Number(item.id || 0),
        action: String(item.action || item.method || 'request'),
        admin_id: Number(item.admin_id || 0),
        target_type: String(item.target_type || item.path || 'request'),
        target_id: Number(item.target_id || 0),
        details: String(item.details || ''),
        created_at: String(item.created_at || ''),
      })),
    };
  },
};
