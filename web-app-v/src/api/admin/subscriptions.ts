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
    api.post<UserSubscription>('/admin/subscriptions', data),

  // Update subscription
  updateSubscription: (id: number, data: Partial<UserSubscription>) =>
    api.put<UserSubscription>(`/admin/subscriptions/${id}`, data),

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
    api.post<void>(`/admin/subscriptions/${id}/revoke`, data || {}),

  // Get subscription stats
  getStats: () =>
    api.get<{
      total_subscriptions: number;
      active_subscriptions: number;
      expired_subscriptions: number;
      revoked_subscriptions: number;
      total_value: number;
    }>('/admin/subscriptions/stats'),
};
