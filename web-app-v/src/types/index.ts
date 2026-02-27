// ==================== API Response Types ====================

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ==================== User Types ====================

export interface User {
  id: number;
  email: string;
  username: string;
  role: 'user' | 'admin';
  balance: number;
  concurrency: number;
  status: string;
  invite_code?: string;
  allowed_groups: number[];
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  role: string;
  balance: number;
  concurrency: number;
  status: string;
  invite_code?: string;
  allowed_groups: number[];
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  user: User;
  token: string;
}

// ==================== API Key Types ====================

export interface APIKey {
  id: number;
  user_id: number;
  key: string;
  name: string;
  group_id?: number;
  status: string;
  ip_whitelist: string[];
  ip_blacklist: string[];
  allow_balance: boolean;
  allow_subscription: boolean;
  subscription_strict: boolean;
  expires_at?: string;
  quota_limit_usd?: number;
  quota_used_usd: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAPIKeyRequest {
  name: string;
  group_id?: number;
  ip_whitelist?: string[];
  ip_blacklist?: string[];
  expires_at?: string;
  quota_limit_usd?: number;
  allow_balance?: boolean;
  allow_subscription?: boolean;
  subscription_strict?: boolean;
}

export interface UpdateAPIKeyRequest {
  name?: string;
  status?: string;
  ip_whitelist?: string[];
  ip_blacklist?: string[];
  expires_at?: string;
  quota_limit_usd?: number;
  allow_balance?: boolean;
  allow_subscription?: boolean;
  subscription_strict?: boolean;
}

// ==================== Group Types ====================

export interface Group {
  id: number;
  name: string;
  description: string;
  platform: string;
  rate_multiplier: number;
  is_exclusive: boolean;
  status: string;
  subscription_type: string;
  daily_limit_usd?: number;
  weekly_limit_usd?: number;
  monthly_limit_usd?: number;
  user_concurrency: number;
  created_at: string;
  updated_at: string;
}

// ==================== Account Types ====================

export interface Account {
  id: number;
  name: string;
  notes?: string;
  platform: string;
  type: string;
  credentials: Record<string, unknown>;
  extra: Record<string, unknown>;
  proxy_id?: number;
  concurrency: number;
  priority: number;
  rate_multiplier: number;
  status: string;
  error_message: string;
  last_used_at?: string;
  expires_at?: number;
  auto_pause_on_expired: boolean;
  created_at: string;
  updated_at: string;
}

// ==================== Usage Log Types ====================

export interface UsageLog {
  id: number;
  user_id: number;
  api_key_id: number;
  account_id: number;
  request_id: string;
  model: string;
  billed_model?: string;
  group_id?: number;
  subscription_id?: number;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  input_cost: number;
  output_cost: number;
  total_cost: number;
  actual_cost: number;
  rate_multiplier: number;
  billing_type: number;
  stream: boolean;
  duration_ms?: number;
  first_token_ms?: number;
  image_count: number;
  image_size?: string;
  user_agent?: string;
  created_at: string;
}

export interface UsageStats {
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  daily_usage: Array<{
    date: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
}

// ==================== Subscription Types ====================

export interface UserSubscription {
  id: number;
  user_id: number;
  group_id: number;
  starts_at: string;
  expires_at: string;
  status: string;
  daily_usage_usd: number;
  weekly_usage_usd: number;
  monthly_usage_usd: number;
  created_at: string;
  updated_at: string;
  group?: Group;
}

// ==================== Redeem Code Types ====================

export interface RedeemCode {
  id: number;
  code: string;
  type: string;
  value: number;
  status: string;
  used_by?: number;
  used_at?: string;
  created_at: string;
  group_id?: number;
  validity_days: number;
}

export interface RedeemHistory {
  id: number;
  code: string;
  type: string;
  value: number;
  group_id?: number;
  validity_days?: number;
  used_at: string;
}

// ==================== Promo Code Types ====================

export interface PromoCode {
  id: number;
  code: string;
  bonus_amount: number;
  max_uses: number;
  used_count: number;
  status: string;
  expires_at?: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ==================== Proxy Types ====================

export interface Proxy {
  id: number;
  name: string;
  protocol: string;
  host: string;
  port: number;
  username: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// ==================== Payment Types ====================

export interface PaymentProvider {
  id: number;
  name: string;
  type: string;
  status: string;
}

export interface Order {
  id: number;
  user_id: number;
  order_no?: string;
  amount: number;
  currency?: string;
  channel?: string;
  description?: string;
  status: string;
  provider: string;
  paid_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderRequest {
  amount: number;
  provider: string;
  return_url?: string;
}

// ==================== Announcement Types ====================

export interface Announcement {
  id: number;
  title: string;
  content: string;
  type?: string;
  status?: string;
  starts_at?: string;
  ends_at?: string;
  created_at: string;
  updated_at: string;
  read_at?: string | null;
}

// ==================== Admin Types ====================

export interface AdminDashboardStats {
  total_users: number;
  total_accounts: number;
  total_requests_today: number;
  total_cost_today: number;
  active_subscriptions: number;
  system_status: string;
}

export interface AdminUser extends User {
  total_spent: number;
  last_active_at?: string;
}

export interface SystemSettings {
  site_name: string;
  site_description: string;
  registration_enabled: boolean;
  email_verification_required: boolean;
  default_user_concurrency: number;
  default_user_balance: number;
}

// ==================== Auth Types ====================

export interface LoginRequest {
  email: string;
  password: string;
  code?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  invite_code?: string;
  promo_code?: string;
  verify_code?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface TOTPSetupResponse {
  secret: string;
  qr_code: string;
}

// ==================== Model Pricing Types ====================

export interface ModelPricing {
  id: number;
  model: string;
  input_price: number;
  output_price: number;
  cache_creation_price?: number;
  cache_read_price?: number;
  platform: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// ==================== Gateway Types ====================

export interface ModelInfo {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
}

// ==================== Chart Types ====================

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface TimeSeriesData {
  time: string;
  requests: number;
  tokens: number;
  cost: number;
  latency?: number;
}

// ==================== App View Types ====================

export const AppView = {
  LANDING: 'LANDING',
  DASHBOARD: 'DASHBOARD',
  ADMIN: 'ADMIN',
  LOGIN: 'LOGIN',
  REGISTER: 'REGISTER'
} as const;

export type AppViewType = typeof AppView[keyof typeof AppView];

// ==================== Activity Log Types ====================

export interface ActivityLog {
  id: string;
  timestamp: string;
  model: string;
  requestId: string;
  status: number;
  latency: string;
  cost: string;
}

// ==================== Invoice Types ====================

export interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: 'Paid' | 'Pending' | 'Overdue';
}

// ==================== Team Member Types ====================

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Developer';
  avatar: string;
}

// ==================== System Region Types ====================

export interface SystemRegion {
  id: string;
  name: string;
  status: 'Operational' | 'Degraded' | 'Maintenance';
  latency: number;
  load: number;
}

// ==================== Admin Audit Log Types ====================

export interface AdminAuditLog {
  id: string;
  action: string;
  admin: string;
  target: string;
  timestamp: string;
  status: 'Success' | 'Failed';
  details: string;
}

// ==================== Platform Account Types ====================

export interface PlatformAccount {
  id: string;
  name: string;
  platform: 'Anthropic' | 'OpenAI' | 'Gemini';
  type: string;
  capacity?: string;
  status: 'Active' | 'Disabled' | 'RateLimited' | 'Expired';
  lastUsed?: string;
  expiresAt?: string;
}

// ==================== Api Group Types ====================

export interface ApiGroup {
  id: string;
  name: string;
  platform: string;
  billingType: 'Standard' | 'Subscription';
  rateMultiplier: string;
  type: 'Public' | 'Exclusive';
  accountsCount: number;
  status: 'Active' | 'Disabled';
}

// ==================== Usage Stat Types ====================

export interface UsageStat {
  id: string;
  user: string;
  apiKey: string;
  model: string;
  tokens: number;
  cost: string;
  duration: string;
  time: string;
}

// ==================== TOTP Types ====================

export interface TOTPStatus {
  enabled: boolean;
  verified: boolean;
}

export interface TOTPVerificationMethod {
  method: 'email' | 'totp';
}

// ==================== Dashboard Types ====================

export interface DashboardStats {
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  today_requests: number;
  today_cost: number;
  active_keys: number;
}

export interface DashboardTrendPoint {
  timestamp: string;
  requests: number;
  tokens: number;
  cost: number;
}

export interface DashboardModelStat {
  model: string;
  requests: number;
  tokens: number;
  cost: number;
}

export interface DashboardApiKeyUsage {
  api_key_id: number;
  api_key_name: string;
  total_requests: number;
  total_tokens: number;
  total_cost: number;
}

// ==================== Subscription Summary Types ====================

export interface SubscriptionSummary {
  active_count: number;
  total_used_usd: number;
  subscriptions: UserSubscription[];
}

// ==================== Admin Ops Types ====================

export interface AlertRule {
  id: number;
  name: string;
  description?: string;
  type: string;
  condition: string;
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertSilence {
  id: number;
  rule_id?: number;
  duration_minutes: number;
  reason?: string;
  created_by: number;
  created_at: string;
  expires_at: string;
}

export interface OpsDashboardOverview {
  total_requests_24h: number;
  total_errors_24h: number;
  avg_latency_ms: number;
  active_accounts: number;
  qps: number;
  error_rate: number;
}

export interface AdvancedSettings {
  max_retries: number;
  retry_delay_ms: number;
  timeout_seconds: number;
  enable_circuit_breaker: boolean;
  circuit_breaker_threshold: number;
  circuit_breaker_timeout_ms: number;
}

export interface EmailNotificationConfig {
  enabled: boolean;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  from_address?: string;
  to_addresses?: string[];
}

export interface RuntimeAlertConfig {
  enabled: boolean;
  webhook_url?: string;
  alert_on_error_rate?: number;
  alert_on_latency_ms?: number;
}

export interface MetricThresholds {
  cpu_threshold: number;
  memory_threshold: number;
  disk_threshold: number;
  error_rate_threshold: number;
  latency_threshold_ms: number;
}

// ==================== Admin Account Types ====================

export interface AccountTodayStats {
  requests: number;
  tokens: number;
  cost: number;
  errors: number;
}

export interface BatchOperationResult {
  success_count: number;
  failed_count: number;
  errors?: string[];
}

// ==================== OAuth Types ====================

export interface OAuthUrlResponse {
  url: string;
  state: string;
}

export interface OpenAITokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export interface QwenDeviceAuthResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface GeminiCapabilitiesResponse {
  models: string[];
  features: string[];
}

// ==================== Cleanup Task Types ====================

export interface CleanupTask {
  id: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  before_date: string;
  dry_run: boolean;
  deleted_count: number;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  created_by: number;
}

// ==================== Model Pricing Types ====================

export interface ModelPricingStatus {
  last_sync_at?: string;
  sync_status: string;
  pending_changes: number;
}

// ==================== System Version Types ====================

export interface SystemVersion {
  version: string;
  build_time: string;
  git_commit: string;
  go_version: string;
}

export interface SystemUpdateInfo {
  has_update: boolean;
  latest_version?: string;
  release_notes?: string;
  download_url?: string;
}
