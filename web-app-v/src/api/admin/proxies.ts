import { api } from '../client';
import type {
  Proxy,
  PaginatedResponse,
} from '../../types';

export interface ProxyQueryParams {
  page?: number;
  page_size?: number;
  status?: string;
}

export const adminProxiesApi = {
  // Get all proxies
  getProxies: (params?: ProxyQueryParams) =>
    api.get<PaginatedResponse<Proxy>>('/admin/proxies', { params }),

  // Get proxy by ID
  getProxy: (id: number) =>
    api.get<Proxy>(`/admin/proxies/${id}`),

  // Create proxy
  createProxy: (data: Partial<Proxy>) =>
    api.post<Proxy>('/admin/proxies', data),

  // Update proxy
  updateProxy: (id: number, data: Partial<Proxy>) =>
    api.put<Proxy>(`/admin/proxies/${id}`, data),

  // Delete proxy
  deleteProxy: (id: number) =>
    api.delete<void>(`/admin/proxies/${id}`),

  // Test proxy
  testProxy: (id: number) =>
    api.post<{
      success: boolean;
      latency_ms: number;
      message: string;
    }>(`/admin/proxies/${id}/test`, {}),

  // Set proxy status
  setProxyStatus: (id: number, status: string) =>
    api.put<Proxy>(`/admin/proxies/${id}`, { status }),

  // Get proxy stats
  getProxyStats: (id: number) =>
    api.get<{
      total_accounts: number;
      total_requests: number;
      avg_latency: number;
    }>(`/admin/proxies/${id}/stats`),

  // Get proxy accounts
  getProxyAccounts: (id: number) =>
    api.get<Array<{
      id: number;
      name: string;
      platform: string;
      status: string;
      last_used_at?: string;
    }>>(`/admin/proxies/${id}/accounts`),

  // Get all proxies (no pagination)
  getAllProxies: () =>
    api.get<Proxy[]>('/admin/proxies/all'),

  // Batch create proxies
  batchCreate: (data: { proxies: Partial<Proxy>[] }) =>
    api.post<{ success_count: number; failed_count: number; errors: string[] }>('/admin/proxies/batch', data),

  // Batch delete proxies
  batchDelete: (ids: number[]) =>
    api.post<{ deleted_count: number }>('/admin/proxies/batch-delete', { ids }),
};
