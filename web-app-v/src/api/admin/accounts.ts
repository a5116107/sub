import { api } from '../client';
import type {
  Account,
  PaginatedResponse,
} from '../../types';

export interface AccountQueryParams {
  page?: number;
  page_size?: number;
  platform?: string;
  status?: string;
  group_id?: number;
}

export const adminAccountsApi = {
  // Get all accounts
  getAccounts: (params?: AccountQueryParams) =>
    api.get<PaginatedResponse<Account>>('/admin/accounts', { params }),

  // Get account by ID
  getAccount: (id: number) =>
    api.get<Account>(`/admin/accounts/${id}`),

  // Create account
  createAccount: (data: Partial<Account>) =>
    api.post<Account>('/admin/accounts', data),

  // Update account
  updateAccount: (id: number, data: Partial<Account>) =>
    api.put<Account>(`/admin/accounts/${id}`, data),

  // Delete account
  deleteAccount: (id: number) =>
    api.delete<void>(`/admin/accounts/${id}`),

  // Refresh account
  refreshAccount: (id: number) =>
    api.post<{ success: boolean; message: string }>(`/admin/accounts/${id}/refresh`, {}),

  // Test account
  testAccount: (id: number) =>
    api.post<{ success: boolean; message: string }>(`/admin/accounts/${id}/test`, {}),

  // Set account status
  setAccountStatus: (id: number, status: string) =>
    api.put<Account>(`/admin/accounts/${id}`, { status }),

  // Get account usage
  getAccountUsage: (id: number, params?: { start_date?: string; end_date?: string }) =>
    api.get<{
      total_requests: number;
      total_tokens: number;
      total_cost: number;
      daily_stats: Array<{
        date: string;
        requests: number;
        tokens: number;
        cost: number;
      }>;
    }>(`/admin/accounts/${id}/usage`, { params }),

  // Get OAuth URL for account
  getOAuthUrl: () =>
    api.post<{ url: string }>('/admin/accounts/generate-auth-url'),

  // Complete OAuth for account
  completeOAuth: (code: string, state?: string) =>
    api.post<void>('/admin/accounts/exchange-code', { code, state }),

  // ==================== Batch Operations ====================

  // Batch create accounts
  batchCreate: (data: { accounts: Partial<Account>[] }) =>
    api.post<{ success_count: number; failed_count: number; errors: string[] }>('/admin/accounts/batch', data),

  // Batch refresh tier
  batchRefreshTier: (data: { account_ids: number[] }) =>
    api.post<{ success_count: number; failed_count: number }>('/admin/accounts/batch-refresh-tier', data),

  // Batch update credentials
  batchUpdateCredentials: (data: { account_ids: number[]; credentials: Record<string, unknown> }) =>
    api.post<{ success_count: number; failed_count: number }>('/admin/accounts/batch-update-credentials', data),

  // Bulk update accounts
  bulkUpdate: (data: { account_ids: number[]; updates: Partial<Account> }) =>
    api.post<{ success_count: number; failed_count: number }>('/admin/accounts/bulk-update', data),

  // Sync from CRS
  syncFromCRS: () =>
    api.post<{ synced_count: number; message: string }>('/admin/accounts/sync/crs'),

  // ==================== Account Actions ====================

  // Clear error status
  clearError: (id: number) =>
    api.post<void>(`/admin/accounts/${id}/clear-error`, {}),

  // Clear rate limit
  clearRateLimit: (id: number) =>
    api.post<void>(`/admin/accounts/${id}/clear-rate-limit`, {}),

  // Refresh tier
  refreshTier: (id: number) =>
    api.post<void>(`/admin/accounts/${id}/refresh-tier`, {}),

  // Set schedulable status
  setSchedulable: (id: number, schedulable: boolean) =>
    api.post<void>(`/admin/accounts/${id}/schedulable`, { schedulable }),

  // Get temp unschedulable status
  getTempUnschedulable: (id: number) =>
    api.get<{ unschedulable_until: string | null }>(`/admin/accounts/${id}/temp-unschedulable`),

  // Set temp unschedulable
  setTempUnschedulable: (id: number, duration_minutes: number) =>
    api.post<void>(`/admin/accounts/${id}/schedulable`, { schedulable: false, duration_minutes }),

  // Clear temp unschedulable
  clearTempUnschedulable: (id: number) =>
    api.delete<void>(`/admin/accounts/${id}/temp-unschedulable`),

  // Get today stats
  getTodayStats: (id: number) =>
    api.get<{
      requests: number;
      tokens: number;
      cost: number;
      errors: number;
    }>(`/admin/accounts/${id}/today-stats`),

  // Get account models
  getModels: (id: number) =>
    api.get<Array<string | { id?: string; name?: string }>>(`/admin/accounts/${id}/models`)
      .then((models) => (models || []).map((model) => {
        if (typeof model === 'string') return model;
        return model.id || model.name || '';
      }).filter(Boolean)),

  // Get account stats
  getStats: (id: number, params?: { days?: number }) =>
    api.get<{
      total_requests: number;
      total_tokens: number;
      total_cost: number;
      daily_stats: Array<{
        date: string;
        requests: number;
        tokens: number;
        cost: number;
      }>;
    }>(`/admin/accounts/${id}/stats`, { params }),

  // ==================== OAuth Operations ====================

  // Generate auth URL
  generateAuthUrl: (data?: { redirect_uri?: string }) =>
    api.post<{ url: string }>('/admin/accounts/generate-auth-url', data),

  // Generate setup token URL
  generateSetupTokenUrl: (data?: { redirect_uri?: string }) =>
    api.post<{ url: string }>('/admin/accounts/generate-setup-token-url', data),

  // Exchange code
  exchangeCode: (code: string, state?: string) =>
    api.post<void>('/admin/accounts/exchange-code', { code, state }),

  // Exchange setup token code
  exchangeSetupTokenCode: (code: string, state?: string) =>
    api.post<void>('/admin/accounts/exchange-setup-token-code', { code, state }),

  // Cookie auth
  cookieAuth: (data: { cookies: string }) =>
    api.post<void>('/admin/accounts/cookie-auth', data),

  // Setup token cookie auth
  setupTokenCookieAuth: (data: { cookies: string }) =>
    api.post<void>('/admin/accounts/setup-token-cookie-auth', data),
};
