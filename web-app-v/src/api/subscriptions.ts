import { api } from './client';
import type {
  UserSubscription,
  Group,
  SubscriptionSummary,
} from '../types';

export const subscriptionsApi = {
  // Get user subscriptions
  getSubscriptions: () =>
    api.get<UserSubscription[]>('/subscriptions'),

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
    }>(`/subscriptions/${id}/progress`),

  // Get active subscriptions
  getActive: () =>
    api.get<UserSubscription[]>('/subscriptions/active'),

  // Get all subscriptions progress
  getAllProgress: () =>
    api.get<{
      subscriptions: UserSubscription[];
      daily_usage: number;
      daily_limit: number;
      weekly_usage: number;
      weekly_limit: number;
      monthly_usage: number;
      monthly_limit: number;
    }>('/subscriptions/progress'),

  // Get available subscription groups
  getAvailableGroups: () =>
    api.get<Group[]>('/groups/available'),

  // Get subscription summary
  getSummary: () =>
    api.get<SubscriptionSummary>('/subscriptions/summary'),
};
