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

  // Get promo code usages
  getUsages: (id: number, params?: { page?: number; page_size?: number }) =>
    api.get<PaginatedResponse<{
      id: number;
      user_id: number;
      user_email: string;
      used_at: string;
    }>>(`/admin/promo-codes/${id}/usages`, { params }),

  // Get promo stats
  getStats: async () => {
    const response = await api.get<PaginatedResponse<PromoCode>>('/admin/promo-codes', {
      params: { page: 1, page_size: 500 },
    });
    const items = response?.items || [];
    return {
      total_codes: response?.total ?? items.length,
      active_codes: items.filter((promoCode) => (promoCode.status || '').toLowerCase() === 'active').length,
      expired_codes: items.filter((promoCode) => (promoCode.status || '').toLowerCase() === 'expired').length,
      total_uses: items.reduce((acc, promoCode) => acc + (promoCode.used_count || 0), 0),
      total_bonus_given: items.reduce((acc, promoCode) => acc + ((promoCode.used_count || 0) * (promoCode.bonus_amount || 0)), 0),
    };
  },
};
