// Subscription API functions
import { useQuery } from '@tanstack/vue-query'
import { get } from '~/shared/api/client'
import type {
  UserSubscription,
  SubscriptionProgressInfo,
  SubscriptionSummary
} from '../model/types'

// Query Keys
const SUBSCRIPTION_KEYS = {
  all: ['subscriptions'] as const,
  list: () => [...SUBSCRIPTION_KEYS.all, 'list'] as const,
  active: () => [...SUBSCRIPTION_KEYS.all, 'active'] as const,
  progress: () => [...SUBSCRIPTION_KEYS.all, 'progress'] as const,
  summary: () => [...SUBSCRIPTION_KEYS.all, 'summary'] as const
}

// API functions
export const subscriptionApi = {
  list: () => get<UserSubscription[]>('/subscriptions'),
  getActive: () => get<UserSubscription[]>('/subscriptions/active'),
  getProgress: () => get<SubscriptionProgressInfo[]>('/subscriptions/progress'),
  getSummary: () => get<SubscriptionSummary>('/subscriptions/summary')
}

// Composables
export function useSubscriptionsQuery() {
  return useQuery({
    queryKey: SUBSCRIPTION_KEYS.list(),
    queryFn: () => subscriptionApi.list()
  })
}

export function useActiveSubscriptionsQuery() {
  return useQuery({
    queryKey: SUBSCRIPTION_KEYS.active(),
    queryFn: () => subscriptionApi.getActive()
  })
}

export function useSubscriptionProgressQuery() {
  return useQuery({
    queryKey: SUBSCRIPTION_KEYS.progress(),
    queryFn: () => subscriptionApi.getProgress()
  })
}

export function useSubscriptionSummaryQuery() {
  return useQuery({
    queryKey: SUBSCRIPTION_KEYS.summary(),
    queryFn: () => subscriptionApi.getSummary()
  })
}
