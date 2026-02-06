import { api } from '../client';
import type {
  PromoCode,
  PaginatedResponse,
} from '../../types';

export interface PromoCodeQueryParams {
  page?: number;
  page_size?: number;
  status?: string;
}

export const adminPromoApi = {
  // Get all promo codes
  getCodes: (params?: PromoCodeQueryParams) =>
    api.get<PaginatedResponse<PromoCode>>('/admin/promo-codes', { params }),

  // Get promo code by ID
  getCode: (id: number) =>
    api.get<PromoCode>(`/admin/promo-codes/${id}`),

  // Create promo code
  createCode: (data: Partial<PromoCode>) =>
    api.post<PromoCode>('/admin/promo-codes', data),

  // Update promo code
  updateCode: (id: number, data: Partial<PromoCode>) =>
    api.put<PromoCode>(`/admin/promo-codes/${id}`, data),

  // Delete promo code
  deleteCode: (id: number) =>
    api.delete<void>(`/admin/promo-codes/${id}`),

  // Get promo code usage
  getUsage: (id: number, params?: { page?: number; page_size?: number }) =>
    api.get<PaginatedResponse<{
      id: number;
      user_id: number;
      user_email: string;
      used_at: string;
    }>>(`/admin/promo-codes/${id}/usage`, { params }),

  // Get promo stats
  getStats: () =>
    api.get<{
      total_codes: number;
      active_codes: number;
      expired_codes: number;
      total_uses: number;
      total_bonus_given: number;
    }>('/admin/promo-codes/stats'),
};
