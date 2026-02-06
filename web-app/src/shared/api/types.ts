// API type definitions

export interface LoginRequest {
  email: string
  password: string
  turnstile_token: string
}

export interface RegisterRequest {
  email: string
  password: string
  verify_code?: string
  turnstile_token: string
  promo_code?: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export interface TotpLoginResponse {
  requires_2fa: true
  temp_token: string
  user_email_masked: string
}

export interface Login2FARequest {
  temp_token: string
  totp_code: string
}

export interface SendVerifyCodeRequest {
  email: string
  turnstile_token: string
}

export interface SendVerifyCodeResponse {
  message: string
  countdown: number
}

export interface ValidatePromoCodeRequest {
  code: string
}

export interface ValidatePromoCodeResponse {
  valid: boolean
  bonus_amount?: number
  error_code?: string
  message?: string
}

export interface ForgotPasswordRequest {
  email: string
  turnstile_token: string
}

export interface ResetPasswordRequest {
  email: string
  token: string
  new_password: string
}

export interface UpdateProfileRequest {
  username?: string
}

export interface ChangePasswordRequest {
  old_password: string
  new_password: string
}

export interface TotpStatusResponse {
  enabled: boolean
  enabled_at?: number
  feature_enabled: boolean
}

export interface TotpSetupRequest {
  email_code: string
  password: string
}

export interface TotpSetupResponse {
  secret: string
  qr_code_url: string
  setup_token: string
  countdown: number
}

export interface TotpEnableRequest {
  totp_code: string
  setup_token: string
}

export interface TotpDisableRequest {
  email_code: string
  password: string
}

export interface CreateAPIKeyRequest {
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

export interface UpdateAPIKeyRequest {
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

export interface RedeemRequest {
  code: string
}

export interface CreateTopUpRequest {
  amount: number
  provider: string
  channel?: string
}

export interface PublicSettings {
  registration_enabled: boolean
  email_verify_enabled: boolean
  promo_code_enabled: boolean
  password_reset_enabled: boolean
  totp_enabled: boolean
  turnstile_enabled: boolean
  turnstile_site_key: string
  site_name: string
  site_logo: string
  site_subtitle: string
  api_base_url: string
  contact_info: string
  doc_url: string
  home_content: string
  landing_pricing_enabled: boolean
  landing_pricing_config: string
  landing_pricing_groups: number[]
  subscriptions_enabled: boolean
  hide_ccs_import_button: boolean
  purchase_subscription_enabled: boolean
  purchase_subscription_url: string
  linuxdo_oauth_enabled: boolean
  version: string
}

export interface DocsNavItem {
  key: string
  title: string
  order: number
}

export interface DocsPage {
  key: string
  lang: string
  title: string
  format: string
  markdown: string
  updated_at: string
}

export interface User {
  id: number
  email: string
  username: string
  role: 'user' | 'admin'
  balance: number
  concurrency: number
  status: 'active' | 'disabled'
  invite_code: string
  allowed_groups: number[]
  created_at: string
  updated_at: string
}

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

export interface Group {
  id: number
  name: string
  description: string
  platform: string
  rate_multiplier: number
  is_exclusive: boolean
  status: 'active' | 'inactive'
  subscription_type: 'standard' | 'subscription'
  daily_limit_usd?: number
  weekly_limit_usd?: number
  monthly_limit_usd?: number
  user_concurrency: number
  image_price_1k: number
  image_price_2k: number
  image_price_4k: number
  claude_code_only: boolean
  fallback_group_id?: number
  created_at: string
  updated_at: string
}

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

export interface UserSubscription {
  id: number
  user_id: number
  group_id: number
  started_at: string
  expires_at: string
  status: string
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

export interface UserAnnouncement {
  id: number
  title: string
  content: string
  type: string
  is_read: boolean
  created_at: string
}

export interface PaymentProvider {
  id: string
  name: string
  enabled: boolean
  channels?: PaymentChannel[]
}

export interface PaymentChannel {
  id: string
  name: string
  min_amount: number
  max_amount: number
}

export interface PaymentOrder {
  id: string
  amount: number
  provider: string
  channel?: string
  status: string
  payment_url?: string
  created_at: string
  expires_at?: string
}

export interface DashboardStats {
  total_requests: number
  total_tokens: number
  total_cost: number
  active_api_keys: number
}

export interface DashboardTrend {
  date: string
  requests: number
  tokens: number
  cost: number
}

export interface ModelUsage {
  model: string
  requests: number
  tokens: number
  cost: number
}

export interface APIKeyUsage {
  api_key_id: number
  name: string
  requests: number
  tokens: number
  cost: number
}

// Admin User Management Types
export interface CreateUserRequest {
  email: string
  password: string
  username?: string
  notes?: string
  balance?: number
  concurrency?: number
  allowed_groups?: number[]
}

export interface UpdateUserRequest {
  email?: string
  password?: string
  username?: string
  notes?: string
  balance?: number
  concurrency?: number
  status?: 'active' | 'disabled'
  allowed_groups?: number[]
}

export interface UpdateBalanceRequest {
  balance: number
  operation: 'set' | 'add' | 'subtract'
  notes?: string
}

// Admin Group Management Types
export interface CreateGroupRequest {
  name: string
  description?: string
  platform?: 'anthropic' | 'openai' | 'gemini' | 'antigravity'
  rate_multiplier?: number
  is_exclusive?: boolean
  subscription_type?: 'standard' | 'subscription'
  daily_limit_usd?: number
  weekly_limit_usd?: number
  monthly_limit_usd?: number
  user_concurrency?: number
  image_price_1k?: number
  image_price_2k?: number
  image_price_4k?: number
  claude_code_only?: boolean
  fallback_group_id?: number | null
  model_routing?: Record<string, number[]>
  model_routing_enabled?: boolean
}

export interface UpdateGroupRequest {
  name?: string
  description?: string
  platform?: 'anthropic' | 'openai' | 'gemini' | 'antigravity'
  rate_multiplier?: number
  is_exclusive?: boolean
  status?: 'active' | 'inactive'
  subscription_type?: 'standard' | 'subscription'
  daily_limit_usd?: number
  weekly_limit_usd?: number
  monthly_limit_usd?: number
  user_concurrency?: number
  image_price_1k?: number
  image_price_2k?: number
  image_price_4k?: number
  claude_code_only?: boolean
  fallback_group_id?: number | null
  model_routing?: Record<string, number[]>
  model_routing_enabled?: boolean
}

// Admin Account Management Types
export interface Account {
  id: number
  name: string
  notes?: string
  platform: string
  type: 'oauth' | 'setup-token' | 'apikey'
  credentials?: Record<string, any>
  extra?: Record<string, any>
  proxy_id?: number
  concurrency: number
  priority: number
  rate_multiplier: number
  status: 'active' | 'inactive' | 'error' | 'expired'
  group_ids: number[]
  expires_at?: string
  auto_pause_on_expired: boolean
  created_at: string
  updated_at: string
  last_used_at?: string
  error_message?: string
}

export interface CreateAccountRequest {
  name: string
  notes?: string
  platform: string
  type: 'oauth' | 'setup-token' | 'apikey'
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

export interface UpdateAccountRequest {
  name?: string
  notes?: string
  platform?: string
  type?: 'oauth' | 'setup-token' | 'apikey'
  credentials?: Record<string, any>
  extra?: Record<string, any>
  proxy_id?: number
  concurrency?: number
  priority?: number
  rate_multiplier?: number
  status?: 'active' | 'inactive' | 'error' | 'expired'
  group_ids?: number[]
  expires_at?: number
  auto_pause_on_expired?: boolean
}

export interface BulkUpdateAccountsRequest {
  account_ids: number[]
  concurrency?: number
  status?: 'active' | 'inactive'
  group_ids?: number[]
}

export interface AccountTestResult {
  success: boolean
  message?: string
  models?: string[]
}

export interface AccountStats {
  total_requests: number
  total_tokens: number
  total_cost: number
  today_requests: number
  error_count: number
}

// Admin Dashboard Types
export interface AdminDashboardStats {
  total_users: number
  total_accounts: number
  total_api_keys: number
  total_requests_today: number
  total_cost_today: number
  active_accounts: number
  error_accounts: number
}

export interface RealtimeMetrics {
  current_requests: number
  qps: number
  latency_p50: number
  latency_p95: number
  latency_p99: number
  error_rate: number
}

export interface DashboardTrendItem {
  date: string
  requests: number
  tokens: number
  cost: number
  users: number
  api_keys: number
}

export interface ModelStatsItem {
  model: string
  requests: number
  input_tokens: number
  output_tokens: number
  cost: number
  percentage: number
}

export interface APIKeyTrendItem {
  api_key_id: number
  name: string
  date: string
  requests: number
  tokens: number
  cost: number
}

export interface UserTrendItem {
  user_id: number
  email: string
  date: string
  requests: number
  tokens: number
  cost: number
}

// Proxy Types
export interface Proxy {
  id: number
  name: string
  url: string
  username?: string
  password?: string
  status: 'active' | 'inactive'
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface CreateProxyRequest {
  name: string
  url: string
  username?: string
  password?: string
}

export interface UpdateProxyRequest {
  name?: string
  url?: string
  username?: string
  password?: string
  status?: 'active' | 'inactive'
}

// Redeem Code Types
export interface RedeemCode {
  id: number
  code: string
  amount: number
  status: 'active' | 'used' | 'expired'
  used_by?: number
  used_at?: string
  expires_at?: string
  created_at: string
}

export interface GenerateRedeemCodesRequest {
  count: number
  amount: number
  expires_at?: string
}

export interface RedeemCodeStats {
  total: number
  active: number
  used: number
  expired: number
  total_amount: number
  used_amount: number
}

// Promo Code Types
export interface PromoCode {
  id: number
  code: string
  bonus_amount: number
  max_uses: number
  used_count: number
  status: 'active' | 'inactive' | 'expired'
  expires_at?: string
  created_at: string
}

export interface CreatePromoCodeRequest {
  code: string
  bonus_amount: number
  max_uses?: number
  expires_at?: string
}

export interface UpdatePromoCodeRequest {
  code?: string
  bonus_amount?: number
  max_uses?: number
  status?: 'active' | 'inactive' | 'expired'
  expires_at?: string
}

export interface PromoCodeUsage {
  id: number
  promo_code_id: number
  user_id: number
  user_email: string
  used_at: string
}

// Announcement Types
export interface Announcement {
  id: number
  title: string
  content: string
  type: 'info' | 'warning' | 'success' | 'error'
  status: 'active' | 'inactive'
  priority: number
  start_at?: string
  end_at?: string
  created_at: string
  updated_at: string
}

export interface CreateAnnouncementRequest {
  title: string
  content: string
  type?: 'info' | 'warning' | 'success' | 'error'
  priority?: number
  start_at?: string
  end_at?: string
}

export interface UpdateAnnouncementRequest {
  title?: string
  content?: string
  type?: 'info' | 'warning' | 'success' | 'error'
  status?: 'active' | 'inactive'
  priority?: number
  start_at?: string
  end_at?: string
}

// System Settings Types
export interface SystemSettings {
  site_name: string
  site_logo: string
  site_subtitle: string
  api_base_url: string
  contact_info: string
  doc_url: string
  home_content: string
  registration_enabled: boolean
  email_verify_enabled: boolean
  promo_code_enabled: boolean
  password_reset_enabled: boolean
  totp_enabled: boolean
  turnstile_enabled: boolean
  turnstile_site_key: string
  turnstile_secret_key: string
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_password: string
  smtp_from: string
  smtp_tls: boolean
  landing_pricing_enabled: boolean
  landing_pricing_config: string
  landing_pricing_groups: number[]
  subscriptions_enabled: boolean
  purchase_subscription_enabled: boolean
  purchase_subscription_url: string
  linuxdo_oauth_enabled: boolean
  linuxdo_client_id: string
  linuxdo_client_secret: string
}

export interface UpdateSystemSettingsRequest {
  site_name?: string
  site_logo?: string
  site_subtitle?: string
  api_base_url?: string
  contact_info?: string
  doc_url?: string
  home_content?: string
  registration_enabled?: boolean
  email_verify_enabled?: boolean
  promo_code_enabled?: boolean
  password_reset_enabled?: boolean
  totp_enabled?: boolean
  turnstile_enabled?: boolean
  turnstile_site_key?: string
  turnstile_secret_key?: string
  smtp_host?: string
  smtp_port?: number
  smtp_user?: string
  smtp_password?: string
  smtp_from?: string
  smtp_tls?: boolean
  landing_pricing_enabled?: boolean
  landing_pricing_config?: string
  landing_pricing_groups?: number[]
  subscriptions_enabled?: boolean
  purchase_subscription_enabled?: boolean
  purchase_subscription_url?: string
  linuxdo_oauth_enabled?: boolean
  linuxdo_client_id?: string
  linuxdo_client_secret?: string
}

export interface StreamTimeoutSettings {
  first_token_timeout_ms: number
  stream_idle_timeout_ms: number
  max_stream_duration_ms: number
}

// Model Pricing Types
export interface ModelPricing {
  model: string
  input_price: number
  output_price: number
  cache_creation_price?: number
  cache_read_price?: number
  image_price?: number
  updated_at: string
}

export interface ModelPricingOverride {
  model: string
  input_price?: number
  output_price?: number
  cache_creation_price?: number
  cache_read_price?: number
  image_price?: number
}

// Admin Subscription Types
export interface AdminSubscription {
  id: number
  user_id: number
  user_email: string
  group_id: number
  group_name: string
  started_at: string
  expires_at: string
  status: 'active' | 'expired' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface AssignSubscriptionRequest {
  user_id: number
  group_id: number
  duration_days: number
}

export interface BulkAssignSubscriptionRequest {
  user_ids: number[]
  group_id: number
  duration_days: number
}

export interface ExtendSubscriptionRequest {
  days: number
}

// Ops Types
export interface ConcurrencyStats {
  total_concurrent: number
  user_concurrent: Record<number, number>
  account_concurrent: Record<number, number>
}

export interface AccountAvailability {
  account_id: number
  name: string
  platform: string
  status: string
  schedulable: boolean
  temp_unschedulable: boolean
  error_count: number
  last_error?: string
}

export interface RealtimeTraffic {
  timestamp: number
  requests_per_second: number
  tokens_per_second: number
  active_streams: number
}

export interface AlertRule {
  id: number
  name: string
  metric: string
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
  threshold: number
  duration: number
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface CreateAlertRuleRequest {
  name: string
  metric: string
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
  threshold: number
  duration: number
}

export interface UpdateAlertRuleRequest {
  name?: string
  metric?: string
  condition?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
  threshold?: number
  duration?: number
  enabled?: boolean
}

export interface AlertEvent {
  id: number
  rule_id: number
  rule_name: string
  metric: string
  value: number
  threshold: number
  status: 'firing' | 'resolved'
  started_at: string
  resolved_at?: string
}

export interface EmailNotificationConfig {
  enabled: boolean
  recipients: string[]
  on_alert: boolean
  on_error: boolean
  on_system_event: boolean
}

export interface RuntimeAlertSettings {
  alert_cooldown_seconds: number
  max_alert_frequency: number
}

export interface MetricThresholds {
  latency_p95_threshold_ms: number
  latency_p99_threshold_ms: number
  error_rate_threshold: number
  min_qps_threshold: number
}

// Ops Dashboard Types
export interface OpsDashboardOverview {
  total_requests_24h: number
  total_tokens_24h: number
  avg_latency_ms: number
  error_rate: number
  active_accounts: number
  account_errors: number
}

export interface ThroughputTrendItem {
  timestamp: number
  requests: number
  tokens: number
  errors: number
}

export interface LatencyHistogramItem {
  bucket: string
  count: number
  percentage: number
}

export interface ErrorTrendItem {
  timestamp: number
  count: number
  types: Record<string, number>
}

export interface ErrorDistributionItem {
  type: string
  count: number
  percentage: number
}

// Error Log Types
export interface ErrorLog {
  id: number
  request_id: string
  error_type: string
  error_message: string
  user_id?: number
  api_key_id?: number
  account_id?: number
  model?: string
  status: 'pending' | 'resolved' | 'retrying'
  retry_count: number
  created_at: string
  updated_at: string
}

export interface RequestError {
  id: number
  request_id: string
  error_type: string
  error_message: string
  upstream_errors: UpstreamError[]
  status: 'pending' | 'resolved' | 'retrying'
  created_at: string
  updated_at: string
}

export interface UpstreamError {
  account_id: number
  account_name: string
  error_type: string
  error_message: string
  timestamp: number
}

export interface RequestDetail {
  request_id: string
  user_id: number
  api_key_id: number
  model: string
  messages: any[]
  response?: any
  error?: string
  duration_ms: number
  created_at: string
}

// User Attribute Types
export interface UserAttributeDefinition {
  id: number
  name: string
  key: string
  type: 'string' | 'number' | 'boolean' | 'select'
  options?: string[]
  required: boolean
  order: number
  created_at: string
  updated_at: string
}

export interface CreateUserAttributeRequest {
  name: string
  key: string
  type: 'string' | 'number' | 'boolean' | 'select'
  options?: string[]
  required?: boolean
}

export interface UpdateUserAttributeRequest {
  name?: string
  type?: 'string' | 'number' | 'boolean' | 'select'
  options?: string[]
  required?: boolean
}

// OAuth Types
export interface OAuthAuthUrlResponse {
  auth_url: string
  state: string
}

export interface OAuthExchangeCodeRequest {
  code: string
  state?: string
}

export interface OAuthTokenResponse {
  access_token: string
  refresh_token?: string
  expires_at?: number
}

// Gemini OAuth Types
export interface GeminiCapability {
  id: string
  name: string
  description: string
  enabled: boolean
}

// Qwen Device Flow Types
export interface QwenDeviceFlowStartResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

export interface QwenDeviceFlowPollRequest {
  device_code: string
}

// System Types
export interface SystemVersion {
  version: string
  build_time: string
  git_commit: string
  go_version: string
}

export interface SystemUpdateInfo {
  has_update: boolean
  current_version: string
  latest_version: string
  release_notes: string
  download_url: string
}

// Usage Cleanup Types
export interface UsageCleanupTask {
  id: number
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  start_date: string
  end_date: string
  deleted_count: number
  progress: number
  error_message?: string
  created_at: string
  updated_at: string
}

export interface CreateUsageCleanupTaskRequest {
  start_date: string
  end_date: string
}
