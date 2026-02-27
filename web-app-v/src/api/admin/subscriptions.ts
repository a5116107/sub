import { api } from '../client';
import type {
  UserSubscription,
  PaginatedResponse,
} from '../../types';

export interface AdminSubscriptionQueryParams {
  page?: number;
  page_size?: number;
  user_id?: number;
  group_id?: number;
  status?: string;
}

const calculateValidityDays = (startsAt: string, expiresAt: string) => {
  const start = new Date(startsAt);
  const end = new Date(expiresAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 30;
  }
  const milliseconds = end.getTime() - start.getTime();
  const days = Math.ceil(milliseconds / (1000 * 60 * 60 * 24));
  return Math.max(1, days);
};

export const adminSubscriptionsApi = {
  // Get all subscriptions
  getSubscriptions: (params?: AdminSubscriptionQueryParams) =>
    api.get<PaginatedResponse<UserSubscription & {
      user_email: string;
      group_name: string;
    }>>('/admin/subscriptions', { params }),

  // Get subscription by ID
  getSubscription: (id: number) =>
    api.get<UserSubscription>(`/admin/subscriptions/${id}`),

  // Create subscription
  createSubscription: (data: {
    user_id: number;
    group_id: number;
    starts_at: string;
    expires_at: string;
  }) =>
    api.post<UserSubscription>('/admin/subscriptions/assign', {
      user_id: data.user_id,
      group_id: data.group_id,
      validity_days: calculateValidityDays(data.starts_at, data.expires_at),
    }),

  // Update subscription
  updateSubscription: async (id: number, data: Partial<UserSubscription>) => {
    if (data.expires_at) {
      const current = await api.get<UserSubscription>(`/admin/subscriptions/${id}`);
      const days = calculateValidityDays(current.expires_at, data.expires_at);
      await api.post<void>(`/admin/subscriptions/${id}/extend`, { days });
    }
    return api.get<UserSubscription>(`/admin/subscriptions/${id}`);
  },

  // Delete subscription
  deleteSubscription: (id: number) =>
    api.delete<void>(`/admin/subscriptions/${id}`),

  // Extend subscription
  extendSubscription: (id: number, data: {
    days: number;
    reason?: string;
  }) =>
    api.post<{ new_expires_at: string }>(`/admin/subscriptions/${id}/extend`, data),

  // Revoke subscription
  revokeSubscription: (id: number, data?: { reason?: string }) =>
    api.delete<void>(`/admin/subscriptions/${id}`, data?.reason ? { data } : undefined),

  // Get subscription stats
  getStats: async () => {
    const response = await api.get<PaginatedResponse<UserSubscription>>('/admin/subscriptions', {
      params: { page: 1, page_size: 500 },
    });
    const items = response?.items || [];
    return {
      total_subscriptions: response?.total ?? items.length,
      active_subscriptions: items.filter((subscription) => (subscription.status || '').toLowerCase() === 'active').length,
      expired_subscriptions: items.filter((subscription) => (subscription.status || '').toLowerCase() === 'expired').length,
      revoked_subscriptions: items.filter((subscription) => (subscription.status || '').toLowerCase() === 'revoked').length,
      total_value: 0,
    };
  },

  // Get subscription progress
  getProgress: (id: number) =>
    api.get<{
      subscription: UserSubscription;
      daily_usage: number;
      daily_limit: number;
      weekly_usage: number;
      weekly_limit: number;
      monthly_usage: number;
      monthly_limit: number;
    }>(`/admin/subscriptions/${id}/progress`),

  // Assign subscription to user
  assign: (data: {
    user_id: number;
    group_id: number;
    starts_at: string;
    expires_at: string;
  }) =>
    api.post<UserSubscription>('/admin/subscriptions/assign', {
      user_id: data.user_id,
      group_id: data.group_id,
      validity_days: calculateValidityDays(data.starts_at, data.expires_at),
    }),

  // Bulk assign subscriptions to users
  bulkAssign: (data: {
    user_ids: number[];
    group_id: number;
    starts_at: string;
    expires_at: string;
  }) =>
    api.post<{
      success_count: number;
      failed_count: number;
      errors?: string[];
    }>('/admin/subscriptions/bulk-assign', {
      user_ids: data.user_ids,
      group_id: data.group_id,
      validity_days: calculateValidityDays(data.starts_at, data.expires_at),
    }),
};
