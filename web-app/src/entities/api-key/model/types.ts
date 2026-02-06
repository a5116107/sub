// API Key entity types

export interface APIKey {
  id: number
  user_id: number
  key: string
  name: string
  group_id: number
  status: 'active' | 'inactive'
  ip_whitelist: string[]
  ip_blacklist: string[]
  allow_balance: boolean
  allow_subscription: boolean
  subscription_strict: boolean
  expires_at?: string
  quota_limit_usd?: number
  quota_used_usd: number
  created_at: string
  updated_at: string
}

export interface CreateAPIKeyInput {
  name: string
  group_id: number
  custom_key?: string
  ip_whitelist?: string[]
  ip_blacklist?: string[]
  allow_balance?: boolean
  allow_subscription?: boolean
  subscription_strict?: boolean
  expires_at?: string
  quota_limit_usd?: number
}

export interface UpdateAPIKeyInput {
  name?: string
  group_id?: number
  status?: 'active' | 'inactive'
  ip_whitelist?: string[]
  ip_blacklist?: string[]
  allow_balance?: boolean
  allow_subscription?: boolean
  subscription_strict?: boolean
  expires_at?: string
  clear_expires_at?: boolean
  quota_limit_usd?: number
  clear_quota_limit_usd?: boolean
}
