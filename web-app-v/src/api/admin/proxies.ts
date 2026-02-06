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
    api.put<void>(`/admin/proxies/${id}/status`, { status }),

  // Get proxy stats
  getProxyStats: (id: number) =>
    api.get<{
      total_accounts: number;
      total_requests: number;
      avg_latency: number;
    }>(`/admin/proxies/${id}/stats`),
};
