// Usage entity types

export interface UsageLog {
  id: number
  user_id: number
  api_key_id: number
  account_id: number
  request_id: string
  model: string
  billed_model: string
  group_id: number
  subscription_id?: number
  input_tokens: number
  output_tokens: number
  cache_creation_tokens: number
  cache_read_tokens: number
  cache_creation_5m_tokens: number
  cache_creation_1h_tokens: number
  input_cost: number
  output_cost: number
  cache_creation_cost: number
  cache_read_cost: number
  total_cost: number
  actual_cost: number
  rate_multiplier: number
  billing_type: number
  stream: boolean
  duration_ms: number
  first_token_ms: number
  image_count: number
  image_size?: string
  user_agent: string
  created_at: string
}

export interface UsageStats {
  total_requests: number
  total_tokens: number
  total_input_tokens: number
  total_output_tokens: number
  total_cost: number
  avg_duration_ms: number
  avg_first_token_ms: number
}

export interface UsageTrend {
  date: string
  requests: number
  tokens: number
  input_tokens: number
  output_tokens: number
  cost: number
}

export interface ModelUsage {
  model: string
  requests: number
  tokens: number
  input_tokens: number
  output_tokens: number
  cost: number
}

export interface APIKeyUsage {
  api_key_id: number
  name: string
  requests: number
  tokens: number
  cost: number
}

export interface DashboardStats {
  total_requests: number
  total_tokens: number
  total_cost: number
  active_api_keys: number
  balance: number
}

export interface UsageQueryParams {
  page?: number
  page_size?: number
  api_key_id?: number
  model?: string
  stream?: boolean
  billing_type?: number
  start_date?: string
  end_date?: string
  timezone?: string
}

export interface UsageStatsParams {
  api_key_id?: number
  period?: 'today' | 'week' | 'month'
  start_date?: string
  end_date?: string
  timezone?: string
}

export interface DashboardTrendParams {
  start_date?: string
  end_date?: string
  granularity?: 'day' | 'week' | 'month'
}

export interface BatchAPIKeysUsageRequest {
  api_key_ids: number[]
}
