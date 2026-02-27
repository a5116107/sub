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
  createCode: async (data: Partial<RedeemCode>) => {
    const generated = await adminRedeemApi.generateCodes({
      count: 1,
      type: data.type || 'balance',
      value: data.value || 0,
      group_id: data.group_id,
      validity_days: data.validity_days,
    });
    if (!generated.codes.length) {
      throw new Error('Failed to create redeem code');
    }
    return adminRedeemApi.getCodeByValue(generated.codes[0]);
  },

  // Generate multiple redeem codes
  generateCodes: async (data: GenerateRedeemCodesRequest) => {
    const created = await api.post<RedeemCode[]>('/admin/redeem-codes/generate', data);
    const codes = (created || []).map((item) => item.code).filter(Boolean);
    return { codes, count: codes.length };
  },

  // Update redeem code
  updateCode: async (id: number, data: Partial<RedeemCode>) => {
    if ((data.status || '').toLowerCase() === 'expired') {
      await api.post<void>(`/admin/redeem-codes/${id}/expire`, {});
    }
    return api.get<RedeemCode>(`/admin/redeem-codes/${id}`);
  },

  // Delete redeem code
  deleteCode: (id: number) =>
    api.delete<void>(`/admin/redeem-codes/${id}`),

  // Revoke redeem code
  revokeCode: (id: number) =>
    api.post<void>(`/admin/redeem-codes/${id}/expire`, {}),

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

  // Batch delete redeem codes
  batchDelete: (ids: number[]) =>
    api.post<{ deleted_count: number }>('/admin/redeem-codes/batch-delete', { ids }),

  // Expire redeem code
  expireCode: (id: number) =>
    api.post<void>(`/admin/redeem-codes/${id}/expire`, {}),

  // Lookup helper by generated code value
  getCodeByValue: async (codeValue: string) => {
    const response = await api.get<PaginatedResponse<RedeemCode>>('/admin/redeem-codes', {
      params: { page: 1, page_size: 200, search: codeValue },
    });
    const found = (response?.items || []).find((item) => item.code === codeValue);
    if (!found) {
      throw new Error('Redeem code not found after generation');
    }
    return found;
  },
};
