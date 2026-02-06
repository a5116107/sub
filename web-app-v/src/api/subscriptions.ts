import { api } from './client';
import type {
  UserSubscription,
  Group,
} from '../types';

export const subscriptionsApi = {
  // Get user subscriptions
  getSubscriptions: () =>
    api.get<UserSubscription[]>('/user/subscriptions'),

  // Get subscription by ID
  getSubscription: (id: number) =>
    api.get<UserSubscription>(`/user/subscriptions/${id}`),

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
    }>(`/user/subscriptions/${id}/progress`),

  // Get available subscription groups
  getAvailableGroups: () =>
    api.get<Group[]>('/user/subscriptions/groups'),
};
