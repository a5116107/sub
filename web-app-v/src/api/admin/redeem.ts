import { api } from '../client';
import type {
  RedeemCode,
  PaginatedResponse,
} from '../../types';

export interface RedeemCodeQueryParams {
  page?: number;
  page_size?: number;
  status?: string;
  type?: string;
}

export interface GenerateRedeemCodesRequest {
  count: number;
  type: string;
  value: number;
  group_id?: number;
  validity_days?: number;
}

export const adminRedeemApi = {
  // Get all redeem codes
  getCodes: (params?: RedeemCodeQueryParams) =>
    api.get<PaginatedResponse<RedeemCode>>('/admin/redeem-codes', { params }),

  // Get redeem code by ID
  getCode: (id: number) =>
    api.get<RedeemCode>(`/admin/redeem-codes/${id}`),

  // Create single redeem code
  createCode: (data: Partial<RedeemCode>) =>
    api.post<RedeemCode>('/admin/redeem-codes', data),

  // Generate multiple redeem codes
  generateCodes: (data: GenerateRedeemCodesRequest) =>
    api.post<{ codes: string[]; count: number }>('/admin/redeem-codes/generate', data),

  // Update redeem code
  updateCode: (id: number, data: Partial<RedeemCode>) =>
    api.put<RedeemCode>(`/admin/redeem-codes/${id}`, data),

  // Delete redeem code
  deleteCode: (id: number) =>
    api.delete<void>(`/admin/redeem-codes/${id}`),

  // Revoke redeem code
  revokeCode: (id: number) =>
    api.post<void>(`/admin/redeem-codes/${id}/revoke`, {}),

  // Export redeem codes
  exportCodes: (params?: { status?: string; type?: string }) =>
    api.get<string>('/admin/redeem-codes/export', { params }),

  // Get redeem stats
  getStats: () =>
    api.get<{
      total_codes: number;
      used_codes: number;
      available_codes: number;
      revoked_codes: number;
      total_value_redeemed: number;
    }>('/admin/redeem-codes/stats'),
};
