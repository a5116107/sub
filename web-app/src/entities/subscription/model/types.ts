// Subscription entity types

export interface UserSubscription {
  id: number
  user_id: number
  group_id: number
  started_at: string
  expires_at: string
  status: 'active' | 'expired' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface SubscriptionProgressInfo {
  subscription_id: number
  group_id: number
  group_name: string
  used_usd: number
  limit_usd: number
  remaining_usd: number
  percentage: number
  period: string
}

export interface SubscriptionSummary {
  active_count: number
  total_used_usd: number
  subscriptions: SubscriptionSummaryItem[]
}

export interface SubscriptionSummaryItem {
  subscription_id: number
  group_name: string
  expires_at: string
  used_usd: number
  limit_usd: number
}
