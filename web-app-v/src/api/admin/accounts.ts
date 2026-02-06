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
    api.put<void>(`/admin/accounts/${id}/status`, { status }),

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
  getOAuthUrl: (id: number) =>
    api.get<{ url: string }>(`/admin/accounts/${id}/oauth/url`),

  // Complete OAuth for account
  completeOAuth: (id: number, code: string) =>
    api.post<void>(`/admin/accounts/${id}/oauth/callback`, { code }),
};
