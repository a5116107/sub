// Account entity types

export type AccountPlatform = 'anthropic' | 'openai' | 'gemini' | 'antigravity' | 'qwen'
export type AccountType = 'oauth' | 'setup-token' | 'apikey'
export type AccountStatus = 'active' | 'inactive' | 'error' | 'expired'

export interface Account {
  id: number
  name: string
  notes: string
  platform: AccountPlatform
  type: AccountType
  status: AccountStatus
  credentials: Record<string, any>
  extra: Record<string, any>
  proxy_id?: number
  concurrency: number
  priority: number
  rate_multiplier: number
  group_ids: number[]
  expires_at?: number
  auto_pause_on_expired: boolean
  created_at: string
  updated_at: string
}

export interface CreateAccountInput {
  name: string
  notes?: string
  platform: AccountPlatform
  type: AccountType
  credentials: Record<string, any>
  extra?: Record<string, any>
  proxy_id?: number
  concurrency?: number
  priority?: number
  rate_multiplier?: number
  group_ids?: number[]
  expires_at?: number
  auto_pause_on_expired?: boolean
}

export interface UpdateAccountInput {
  name?: string
  notes?: string
  platform?: AccountPlatform
  type?: AccountType
  credentials?: Record<string, any>
  extra?: Record<string, any>
  proxy_id?: number
  concurrency?: number
  priority?: number
  rate_multiplier?: number
  group_ids?: number[]
  expires_at?: number
  auto_pause_on_expired?: boolean
  status?: AccountStatus
}

export interface AccountStats {
  total_requests: number
  total_tokens: number
  total_cost: number
  avg_latency_ms: number
}
