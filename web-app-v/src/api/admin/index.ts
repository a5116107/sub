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

export const adminApi = {
  // Get admin dashboard stats
  getDashboardStats: () =>
    api.get<AdminDashboardStats>('/admin/dashboard/stats'),

  // Get admin dashboard trends
  getDashboardTrends: (params?: { days?: number }) =>
    api.get<Array<{
      date: string;
      requests: number;
      cost: number;
      new_users: number;
    }>>('/admin/dashboard/trends', { params }),

  // Get admin dashboard realtime metrics
  getDashboardRealtime: (params?: {
    account_id?: number;
    api_key_id?: number;
    billing_type?: string;
    granularity?: string;
    group_id?: number;
    limit?: number;
    model?: string;
    stream?: boolean;
    user_id?: number;
  }) =>
    api.get<{
      current_qps: number;
      current_latency_ms: number;
      active_requests: number;
      error_rate: number;
    }>('/admin/dashboard/realtime', { params }),

  // Get users trend
  getUsersTrend: (params?: { granularity?: string; limit?: number }) =>
    api.get<Array<{
      timestamp: string;
      total_users: number;
      new_users: number;
      active_users: number;
    }>>('/admin/dashboard/users-trend', { params }),

  // Get API keys trend
  getApiKeysTrend: (params?: { granularity?: string; limit?: number }) =>
    api.get<Array<{
      timestamp: string;
      total_keys: number;
      new_keys: number;
      active_keys: number;
    }>>('/admin/dashboard/api-keys-trend', { params }),

  // Get batch users usage
  getBatchUsersUsage: (data: {
    user_ids?: number[];
    start_date?: string;
    end_date?: string;
  }) =>
    api.get<Array<{
      user_id: number;
      username: string;
      total_requests: number;
      total_cost: number;
      total_tokens: number;
    }>>('/admin/dashboard/users-usage', { data }),

  // Get batch API keys usage
  getBatchApiKeysUsage: (data: {
    api_key_ids?: number[];
    start_date?: string;
    end_date?: string;
  }) =>
    api.get<Array<{
      api_key_id: number;
      api_key_name: string;
      user_id: number;
      total_requests: number;
      total_cost: number;
      total_tokens: number;
    }>>('/admin/dashboard/api-keys-usage', { data }),

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
  getAuditLogs: (params?: { page?: number; page_size?: number }) =>
    api.get<PaginatedResponse<{
      id: number;
      action: string;
      admin_id: number;
      target_type: string;
      target_id: number;
      details: string;
      created_at: string;
    }>>('/admin/audit-logs', { params }),
};
