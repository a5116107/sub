// Group entity types

export type Platform = 'anthropic' | 'openai' | 'gemini' | 'antigravity'
export type SubscriptionType = 'standard' | 'subscription'

export interface Group {
  id: number
  name: string
  description: string
  platform: Platform
  rate_multiplier: number
  is_exclusive: boolean
  status: 'active' | 'inactive'
  subscription_type: SubscriptionType
  daily_limit_usd?: number
  weekly_limit_usd?: number
  monthly_limit_usd?: number
  user_concurrency: number
  image_price_1k: number
  image_price_2k: number
  image_price_4k: number
  claude_code_only: boolean
  fallback_group_id?: number
  model_routing?: Record<string, number[]>
  model_routing_enabled: boolean
  created_at: string
  updated_at: string
}

export interface CreateGroupInput {
  name: string
  description?: string
  platform?: Platform
  rate_multiplier?: number
  is_exclusive?: boolean
  subscription_type?: SubscriptionType
  daily_limit_usd?: number
  weekly_limit_usd?: number
  monthly_limit_usd?: number
  user_concurrency?: number
  image_price_1k?: number
  image_price_2k?: number
  image_price_4k?: number
  claude_code_only?: boolean
  fallback_group_id?: number
  model_routing?: Record<string, number[]>
  model_routing_enabled?: boolean
}

export interface UpdateGroupInput {
  name?: string
  description?: string
  platform?: Platform
  rate_multiplier?: number
  is_exclusive?: boolean
  status?: 'active' | 'inactive'
  subscription_type?: SubscriptionType
  daily_limit_usd?: number
  weekly_limit_usd?: number
  monthly_limit_usd?: number
  user_concurrency?: number
  image_price_1k?: number
  image_price_2k?: number
  image_price_4k?: number
  claude_code_only?: boolean
  fallback_group_id?: number
  model_routing?: Record<string, number[]>
  model_routing_enabled?: boolean
}
