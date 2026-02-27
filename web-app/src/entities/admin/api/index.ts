// Admin API functions
import { get, post, put, del } from '~/shared/api/client'
import type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UpdateBalanceRequest,
  Group,
  CreateGroupRequest,
  UpdateGroupRequest,
  Account,
  CreateAccountRequest,
  UpdateAccountRequest,
  BulkUpdateAccountsRequest,
  AccountTestResult,
  AccountStats,
  AdminDashboardStats,
  RealtimeMetrics,
  DashboardTrendItem,
  ModelStatsItem,
  APIKeyTrendItem,
  UserTrendItem,
  Proxy,
  CreateProxyRequest,
  UpdateProxyRequest,
  RedeemCode,
  GenerateRedeemCodesRequest,
  RedeemCodeStats,
  PromoCode,
  CreatePromoCodeRequest,
  UpdatePromoCodeRequest,
  PromoCodeUsage,
  Announcement,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
  SystemSettings,
  UpdateSystemSettingsRequest,
  StreamTimeoutSettings,
  ModelPricing,
  ModelPricingOverride,
  AdminSubscription,
  AssignSubscriptionRequest,
  BulkAssignSubscriptionRequest,
  ExtendSubscriptionRequest,
  ConcurrencyStats,
  AccountAvailability,
  RealtimeTraffic,
  AlertRule,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  AlertEvent,
  EmailNotificationConfig,
  RuntimeAlertSettings,
  MetricThresholds,
  OpsDashboardOverview,
  ThroughputTrendItem,
  LatencyHistogramItem,
  ErrorTrendItem,
  ErrorDistributionItem,
  ErrorLog,
  RequestError,
  UpstreamError,
  RequestDetail,
  UserAttributeDefinition,
  CreateUserAttributeRequest,
  UpdateUserAttributeRequest,
  OAuthAuthUrlResponse,
  OAuthExchangeCodeRequest,
  OAuthTokenResponse,
  GeminiCapability,
  QwenDeviceFlowStartResponse,
  QwenDeviceFlowPollRequest,
  SystemVersion,
  SystemUpdateInfo,
  UsageCleanupTask,
  CreateUsageCleanupTaskRequest,
  UsageLog
} from '~/shared/api/types'
import type { PaginatedResponse, PaginationParams } from '~/shared/types'

// ============================================
// Query Keys
// ============================================
export const ADMIN_KEYS = {
  // Dashboard
  dashboard: {
    all: ['admin', 'dashboard'] as const,
    stats: () => [...ADMIN_KEYS.dashboard.all, 'stats'] as const,
    realtime: () => [...ADMIN_KEYS.dashboard.all, 'realtime'] as const,
    trend: (days?: number) => [...ADMIN_KEYS.dashboard.all, 'trend', days] as const,
    models: () => [...ADMIN_KEYS.dashboard.all, 'models'] as const,
    apiKeysTrend: (days?: number) => [...ADMIN_KEYS.dashboard.all, 'apiKeysTrend', days] as const,
    usersTrend: (days?: number) => [...ADMIN_KEYS.dashboard.all, 'usersTrend', days] as const
  },

  // Users
  users: {
    all: ['admin', 'users'] as const,
    list: (params?: PaginationParams) => [...ADMIN_KEYS.users.all, 'list', params] as const,
    detail: (id: number) => [...ADMIN_KEYS.users.all, 'detail', id] as const,
    apiKeys: (id: number) => [...ADMIN_KEYS.users.all, 'apiKeys', id] as const,
    usage: (id: number) => [...ADMIN_KEYS.users.all, 'usage', id] as const,
    subscriptions: (id: number) => [...ADMIN_KEYS.users.all, 'subscriptions', id] as const,
    attributes: (id: number) => [...ADMIN_KEYS.users.all, 'attributes', id] as const
  },

  // Groups
  groups: {
    all: ['admin', 'groups'] as const,
    list: (params?: PaginationParams) => [...ADMIN_KEYS.groups.all, 'list', params] as const,
    allGroups: () => [...ADMIN_KEYS.groups.all, 'all'] as const,
    detail: (id: number) => [...ADMIN_KEYS.groups.all, 'detail', id] as const,
    stats: (id: number) => [...ADMIN_KEYS.groups.all, 'stats', id] as const,
    apiKeys: (id: number) => [...ADMIN_KEYS.groups.all, 'apiKeys', id] as const,
    subscriptions: (id: number) => [...ADMIN_KEYS.groups.all, 'subscriptions', id] as const
  },

  // Accounts
  accounts: {
    all: ['admin', 'accounts'] as const,
    list: (params?: PaginationParams) => [...ADMIN_KEYS.accounts.all, 'list', params] as const,
    detail: (id: number) => [...ADMIN_KEYS.accounts.all, 'detail', id] as const,
    stats: (id: number) => [...ADMIN_KEYS.accounts.all, 'stats', id] as const,
    usage: (id: number) => [...ADMIN_KEYS.accounts.all, 'usage', id] as const,
    todayStats: (id: number) => [...ADMIN_KEYS.accounts.all, 'todayStats', id] as const,
    models: (id: number) => [...ADMIN_KEYS.accounts.all, 'models', id] as const,
    tempUnschedulable: (id: number) => [...ADMIN_KEYS.accounts.all, 'tempUnschedulable', id] as const
  },

  // Proxies
  proxies: {
    all: ['admin', 'proxies'] as const,
    list: (params?: PaginationParams) => [...ADMIN_KEYS.proxies.all, 'list', params] as const,
    allProxies: () => [...ADMIN_KEYS.proxies.all, 'all'] as const,
    detail: (id: number) => [...ADMIN_KEYS.proxies.all, 'detail', id] as const,
    stats: (id: number) => [...ADMIN_KEYS.proxies.all, 'stats', id] as const,
    accounts: (id: number) => [...ADMIN_KEYS.proxies.all, 'accounts', id] as const
  },

  // Redeem Codes
  redeemCodes: {
    all: ['admin', 'redeemCodes'] as const,
    list: (params?: PaginationParams) => [...ADMIN_KEYS.redeemCodes.all, 'list', params] as const,
    detail: (id: number) => [...ADMIN_KEYS.redeemCodes.all, 'detail', id] as const,
    stats: () => [...ADMIN_KEYS.redeemCodes.all, 'stats'] as const
  },

  // Promo Codes
  promoCodes: {
    all: ['admin', 'promoCodes'] as const,
    list: (params?: PaginationParams) => [...ADMIN_KEYS.promoCodes.all, 'list', params] as const,
    detail: (id: number) => [...ADMIN_KEYS.promoCodes.all, 'detail', id] as const,
    usages: (id: number) => [...ADMIN_KEYS.promoCodes.all, 'usages', id] as const
  },

  // Announcements
  announcements: {
    all: ['admin', 'announcements'] as const,
    list: (params?: PaginationParams) => [...ADMIN_KEYS.announcements.all, 'list', params] as const,
    detail: (id: number) => [...ADMIN_KEYS.announcements.all, 'detail', id] as const,
    readStatus: (id: number) => [...ADMIN_KEYS.announcements.all, 'readStatus', id] as const
  },

  // Settings
  settings: {
    all: ['admin', 'settings'] as const,
    detail: () => [...ADMIN_KEYS.settings.all, 'detail'] as const,
    streamTimeout: () => [...ADMIN_KEYS.settings.all, 'streamTimeout'] as const,
    adminApiKey: () => [...ADMIN_KEYS.settings.all, 'adminApiKey'] as const
  },

  // Model Pricing
  modelPricing: {
    all: ['admin', 'modelPricing'] as const,
    status: () => [...ADMIN_KEYS.modelPricing.all, 'status'] as const,
    list: () => [...ADMIN_KEYS.modelPricing.all, 'list'] as const
  },

  // Subscriptions
  subscriptions: {
    all: ['admin', 'subscriptions'] as const,
    list: (params?: PaginationParams) => [...ADMIN_KEYS.subscriptions.all, 'list', params] as const,
    detail: (id: number) => [...ADMIN_KEYS.subscriptions.all, 'detail', id] as const,
    progress: (id: number) => [...ADMIN_KEYS.subscriptions.all, 'progress', id] as const
  },

  // Ops
  ops: {
    all: ['admin', 'ops'] as const,
    concurrency: () => [...ADMIN_KEYS.ops.all, 'concurrency'] as const,
    accountAvailability: () => [...ADMIN_KEYS.ops.all, 'accountAvailability'] as const,
    realtimeTraffic: () => [...ADMIN_KEYS.ops.all, 'realtimeTraffic'] as const,
    alertRules: () => [...ADMIN_KEYS.ops.all, 'alertRules'] as const,
    alertEvents: () => [...ADMIN_KEYS.ops.all, 'alertEvents'] as const,
    emailConfig: () => [...ADMIN_KEYS.ops.all, 'emailConfig'] as const,
    runtimeAlert: () => [...ADMIN_KEYS.ops.all, 'runtimeAlert'] as const,
    advancedSettings: () => [...ADMIN_KEYS.ops.all, 'advancedSettings'] as const,
    metricThresholds: () => [...ADMIN_KEYS.ops.all, 'metricThresholds'] as const,
    dashboard: {
      all: ['admin', 'ops', 'dashboard'] as const,
      overview: () => [...ADMIN_KEYS.ops.dashboard.all, 'overview'] as const,
      throughput: () => [...ADMIN_KEYS.ops.dashboard.all, 'throughput'] as const,
      latency: () => [...ADMIN_KEYS.ops.dashboard.all, 'latency'] as const,
      errorTrend: () => [...ADMIN_KEYS.ops.dashboard.all, 'errorTrend'] as const,
      errorDistribution: () => [...ADMIN_KEYS.ops.dashboard.all, 'errorDistribution'] as const
    },
    errors: {
      all: ['admin', 'ops', 'errors'] as const,
      list: (params?: PaginationParams) => [...ADMIN_KEYS.ops.errors.all, 'list', params] as const,
      detail: (id: number) => [...ADMIN_KEYS.ops.errors.all, 'detail', id] as const,
      retries: (id: number) => [...ADMIN_KEYS.ops.errors.all, 'retries', id] as const
    },
    requestErrors: {
      all: ['admin', 'ops', 'requestErrors'] as const,
      list: (params?: PaginationParams) => [...ADMIN_KEYS.ops.requestErrors.all, 'list', params] as const,
      detail: (id: number) => [...ADMIN_KEYS.ops.requestErrors.all, 'detail', id] as const
    },
    upstreamErrors: {
      all: ['admin', 'ops', 'upstreamErrors'] as const,
      list: (params?: PaginationParams) => [...ADMIN_KEYS.ops.upstreamErrors.all, 'list', params] as const,
      detail: (id: number) => [...ADMIN_KEYS.ops.upstreamErrors.all, 'detail', id] as const
    },
    requests: (params?: PaginationParams) => [...ADMIN_KEYS.ops.all, 'requests', params] as const,
    cleanupTasks: () => [...ADMIN_KEYS.ops.all, 'cleanupTasks'] as const
  },

  // User Attributes
  userAttributes: {
    all: ['admin', 'userAttributes'] as const,
    list: () => [...ADMIN_KEYS.userAttributes.all, 'list'] as const,
    detail: (id: number) => [...ADMIN_KEYS.userAttributes.all, 'detail', id] as const
  },

  // System
  system: {
    all: ['admin', 'system'] as const,
    version: () => [...ADMIN_KEYS.system.all, 'version'] as const,
    updates: () => [...ADMIN_KEYS.system.all, 'updates'] as const
  }
}

// ============================================
// Dashboard API
// ============================================
export const adminDashboardApi = {
  getStats: () => get<AdminDashboardStats>('/admin/dashboard/stats'),
  getRealtime: () => get<RealtimeMetrics>('/admin/dashboard/realtime'),
  getTrend: (days = 7) => get<DashboardTrendItem[]>(`/admin/dashboard/trend?days=${days}`),
  getModels: () => get<ModelStatsItem[]>('/admin/dashboard/models'),
  getApiKeysTrend: (days = 7) => get<APIKeyTrendItem[]>(`/admin/dashboard/api-keys-trend?days=${days}`),
  getUsersTrend: (days = 7) => get<UserTrendItem[]>(`/admin/dashboard/users-trend?days=${days}`),
  getUsersUsage: (userIds: number[]) => post<{ user_id: number; usage: number }[]>('/admin/dashboard/users-usage', { user_ids: userIds }),
  getApiKeysUsage: (apiKeyIds: number[]) => post<{ api_key_id: number; usage: number }[]>('/admin/dashboard/api-keys-usage', { api_key_ids: apiKeyIds }),
  backfillAggregation: () => post('/admin/dashboard/aggregation/backfill')
}

// ============================================
// Users API
// ============================================
export const adminUsersApi = {
  list: (params?: PaginationParams) => get<PaginatedResponse<User>>('/admin/users', params),
  get: (id: number) => get<User>(`/admin/users/${id}`),
  create: (data: CreateUserRequest) => post<User>('/admin/users', data),
  update: (id: number, data: UpdateUserRequest) => put<User>(`/admin/users/${id}`, data),
  delete: (id: number) => del(`/admin/users/${id}`),
  updateBalance: (id: number, data: UpdateBalanceRequest) => post(`/admin/users/${id}/balance`, data),
  getApiKeys: (id: number) => get(`/admin/users/${id}/api-keys`),
  getUsage: (id: number, params?: PaginationParams) => get(`/admin/users/${id}/usage`, params),
  getSubscriptions: (id: number) => get(`/admin/users/${id}/subscriptions`),
  getAttributes: (id: number) => get(`/admin/users/${id}/attributes`),
  updateAttributes: (id: number, data: Record<string, any>) => put(`/admin/users/${id}/attributes`, data)
}

// ============================================
// Groups API
// ============================================
export const adminGroupsApi = {
  list: (params?: PaginationParams) => get<PaginatedResponse<Group>>('/admin/groups', params),
  getAll: (platform?: string) => get<Group[]>(`/admin/groups/all${platform ? `?platform=${platform}` : ''}`),
  get: (id: number) => get<Group>(`/admin/groups/${id}`),
  create: (data: CreateGroupRequest) => post<Group>('/admin/groups', data),
  update: (id: number, data: UpdateGroupRequest) => put<Group>(`/admin/groups/${id}`, data),
  delete: (id: number) => del(`/admin/groups/${id}`),
  getStats: (id: number) => get(`/admin/groups/${id}/stats`),
  getApiKeys: (id: number) => get(`/admin/groups/${id}/api-keys`),
  getSubscriptions: (id: number) => get(`/admin/groups/${id}/subscriptions`)
}

// ============================================
// Accounts API
// ============================================
export const adminAccountsApi = {
  list: (params?: PaginationParams) => get<PaginatedResponse<Account>>('/admin/accounts', params),
  get: (id: number) => get<Account>(`/admin/accounts/${id}`),
  create: (data: CreateAccountRequest) => post<Account>('/admin/accounts', data),
  update: (id: number, data: UpdateAccountRequest) => put<Account>(`/admin/accounts/${id}`, data),
  delete: (id: number) => del(`/admin/accounts/${id}`),
  test: (id: number) => post<AccountTestResult>(`/admin/accounts/${id}/test`),
  refresh: (id: number) => post(`/admin/accounts/${id}/refresh`),
  refreshTier: (id: number) => post(`/admin/accounts/${id}/refresh-tier`),
  getStats: (id: number) => get<AccountStats>(`/admin/accounts/${id}/stats`),
  getUsage: (id: number, params?: PaginationParams) => get(`/admin/accounts/${id}/usage`, params),
  getTodayStats: (id: number) => get(`/admin/accounts/${id}/today-stats`),
  clearError: (id: number) => post(`/admin/accounts/${id}/clear-error`),
  clearRateLimit: (id: number) => post(`/admin/accounts/${id}/clear-rate-limit`),
  getTempUnschedulable: (id: number) => get<{ temp_unschedulable: boolean; reason?: string }>(`/admin/accounts/${id}/temp-unschedulable`),
  clearTempUnschedulable: (id: number) => del(`/admin/accounts/${id}/temp-unschedulable`),
  setSchedulable: (id: number, schedulable: boolean) => post(`/admin/accounts/${id}/schedulable`, { schedulable }),
  getModels: (id: number) => get<string[]>(`/admin/accounts/${id}/models`),
  batchCreate: (data: CreateAccountRequest[]) => post<Account[]>('/admin/accounts/batch', data),
  batchUpdateCredentials: (accountIds: number[], credentials: Record<string, any>) =>
    post('/admin/accounts/batch-update-credentials', { account_ids: accountIds, credentials }),
  batchRefreshTier: (accountIds: number[]) => post('/admin/accounts/batch-refresh-tier', { account_ids: accountIds }),
  bulkUpdate: (data: BulkUpdateAccountsRequest) => post('/admin/accounts/bulk-update', data),
  syncFromCRS: () => post('/admin/accounts/sync/crs')
}

// ============================================
// Claude OAuth API
// ============================================
export const adminClaudeOAuthApi = {
  generateAuthUrl: () => post<OAuthAuthUrlResponse>('/admin/accounts/generate-auth-url'),
  generateSetupTokenUrl: () => post<OAuthAuthUrlResponse>('/admin/accounts/generate-setup-token-url'),
  exchangeCode: (data: OAuthExchangeCodeRequest) => post<OAuthTokenResponse>('/admin/accounts/exchange-code', data),
  exchangeSetupTokenCode: (data: OAuthExchangeCodeRequest) => post<OAuthTokenResponse>('/admin/accounts/exchange-setup-token-code', data),
  cookieAuth: (cookie: string) => post<OAuthTokenResponse>('/admin/accounts/cookie-auth', { cookie }),
  setupTokenCookieAuth: (cookie: string) => post<OAuthTokenResponse>('/admin/accounts/setup-token-cookie-auth', { cookie })
}

// ============================================
// OpenAI OAuth API
// ============================================
export const adminOpenAiOAuthApi = {
  generateAuthUrl: () => post<OAuthAuthUrlResponse>('/admin/openai/generate-auth-url'),
  exchangeCode: (data: OAuthExchangeCodeRequest) => post<OAuthTokenResponse>('/admin/openai/exchange-code', data),
  refreshToken: (refreshToken: string) => post<OAuthTokenResponse>('/admin/openai/refresh-token', { refresh_token: refreshToken }),
  refreshAccount: (accountId: number) => post(`/admin/openai/accounts/${accountId}/refresh`),
  createFromOAuth: (tokenData: OAuthTokenResponse, name: string, groupIds: number[]) =>
    post<Account>('/admin/openai/create-from-oauth', { ...tokenData, name, group_ids: groupIds })
}

// ============================================
// Qwen OAuth API
// ============================================
export const adminQwenOAuthApi = {
  startDeviceFlow: () => post<QwenDeviceFlowStartResponse>('/admin/qwen/device/start'),
  pollDeviceFlow: (data: QwenDeviceFlowPollRequest) => post<OAuthTokenResponse | { pending: true }>('/admin/qwen/device/poll', data),
  refreshToken: (refreshToken: string) => post<OAuthTokenResponse>('/admin/qwen/refresh-token', { refresh_token: refreshToken }),
  refreshAccount: (accountId: number) => post(`/admin/qwen/accounts/${accountId}/refresh`),
  createFromDevice: (deviceCode: string, name: string, groupIds: number[]) =>
    post<Account>('/admin/qwen/create-from-device', { device_code: deviceCode, name, group_ids: groupIds })
}

// ============================================
// Gemini OAuth API
// ============================================
export const adminGeminiOAuthApi = {
  generateAuthUrl: () => post<OAuthAuthUrlResponse>('/admin/gemini/oauth/auth-url'),
  exchangeCode: (data: OAuthExchangeCodeRequest) => post<OAuthTokenResponse>('/admin/gemini/oauth/exchange-code', data),
  getCapabilities: () => get<GeminiCapability[]>('/admin/gemini/oauth/capabilities')
}

// ============================================
// Antigravity OAuth API
// ============================================
export const adminAntigravityOAuthApi = {
  generateAuthUrl: () => post<OAuthAuthUrlResponse>('/admin/antigravity/oauth/auth-url'),
  exchangeCode: (data: OAuthExchangeCodeRequest) => post<OAuthTokenResponse>('/admin/antigravity/oauth/exchange-code', data)
}

// ============================================
// Proxies API
// ============================================
export const adminProxiesApi = {
  list: (params?: PaginationParams) => get<PaginatedResponse<Proxy>>('/admin/proxies', params),
  getAll: () => get<Proxy[]>('/admin/proxies/all'),
  get: (id: number) => get<Proxy>(`/admin/proxies/${id}`),
  create: (data: CreateProxyRequest) => post<Proxy>('/admin/proxies', data),
  update: (id: number, data: UpdateProxyRequest) => put<Proxy>(`/admin/proxies/${id}`, data),
  delete: (id: number) => del(`/admin/proxies/${id}`),
  test: (id: number) => post(`/admin/proxies/${id}/test`),
  getStats: (id: number) => get(`/admin/proxies/${id}/stats`),
  getAccounts: (id: number) => get<Account[]>(`/admin/proxies/${id}/accounts`),
  batchDelete: (ids: number[]) => post('/admin/proxies/batch-delete', { ids }),
  batchCreate: (data: CreateProxyRequest[]) => post<Proxy[]>('/admin/proxies/batch', data)
}

// ============================================
// Redeem Codes API
// ============================================
export const adminRedeemCodesApi = {
  list: (params?: PaginationParams) => get<PaginatedResponse<RedeemCode>>('/admin/redeem-codes', params),
  get: (id: number) => get<RedeemCode>(`/admin/redeem-codes/${id}`),
  generate: (data: GenerateRedeemCodesRequest) => post<RedeemCode[]>('/admin/redeem-codes/generate', data),
  delete: (id: number) => del(`/admin/redeem-codes/${id}`),
  batchDelete: (ids: number[]) => post('/admin/redeem-codes/batch-delete', { ids }),
  expire: (id: number) => post(`/admin/redeem-codes/${id}/expire`),
  getStats: () => get<RedeemCodeStats>('/admin/redeem-codes/stats'),
  export: () => get('/admin/redeem-codes/export')
}

// ============================================
// Promo Codes API
// ============================================
export const adminPromoCodesApi = {
  list: (params?: PaginationParams) => get<PaginatedResponse<PromoCode>>('/admin/promo-codes', params),
  get: (id: number) => get<PromoCode>(`/admin/promo-codes/${id}`),
  create: (data: CreatePromoCodeRequest) => post<PromoCode>('/admin/promo-codes', data),
  update: (id: number, data: UpdatePromoCodeRequest) => put<PromoCode>(`/admin/promo-codes/${id}`, data),
  delete: (id: number) => del(`/admin/promo-codes/${id}`),
  getUsages: (id: number) => get<PromoCodeUsage[]>(`/admin/promo-codes/${id}/usages`)
}

// ============================================
// Announcements API
// ============================================
export const adminAnnouncementsApi = {
  list: (params?: PaginationParams) => get<PaginatedResponse<Announcement>>('/admin/announcements', params),
  get: (id: number) => get<Announcement>(`/admin/announcements/${id}`),
  create: (data: CreateAnnouncementRequest) => post<Announcement>('/admin/announcements', data),
  update: (id: number, data: UpdateAnnouncementRequest) => put<Announcement>(`/admin/announcements/${id}`, data),
  delete: (id: number) => del(`/admin/announcements/${id}`),
  getReadStatus: (id: number) => get<{ read_count: number; total_users: number }>(`/admin/announcements/${id}/read-status`)
}

// ============================================
// System Settings API
// ============================================
export const adminSettingsApi = {
  get: () => get<SystemSettings>('/admin/settings'),
  update: (data: UpdateSystemSettingsRequest) => put('/admin/settings', data),
  testSmtp: () => post('/admin/settings/test-smtp'),
  sendTestEmail: (email: string) => post('/admin/settings/send-test-email', { email }),
  getAdminApiKey: () => get<{ api_key: string }>('/admin/settings/admin-api-key'),
  regenerateAdminApiKey: () => post<{ api_key: string }>('/admin/settings/admin-api-key/regenerate'),
  deleteAdminApiKey: () => del('/admin/settings/admin-api-key'),
  getStreamTimeout: () => get<StreamTimeoutSettings>('/admin/settings/stream-timeout'),
  updateStreamTimeout: (data: StreamTimeoutSettings) => put('/admin/settings/stream-timeout', data)
}

// ============================================
// Model Pricing API
// ============================================
export const adminModelPricingApi = {
  getStatus: () => get<{ last_updated: string; model_count: number }>('/admin/model-pricing/status'),
  download: () => get<ModelPricing[]>('/admin/model-pricing/download'),
  import: (data: ModelPricing[]) => post('/admin/model-pricing/import', data),
  setOverride: (data: ModelPricingOverride) => put('/admin/model-pricing/override', data),
  sync: () => post('/admin/model-pricing/sync')
}

// ============================================
// Subscriptions API
// ============================================
export const adminSubscriptionsApi = {
  list: (params?: PaginationParams) => get<PaginatedResponse<AdminSubscription>>('/admin/subscriptions', params),
  get: (id: number) => get<AdminSubscription>(`/admin/subscriptions/${id}`),
  getProgress: (id: number) => get(`/admin/subscriptions/${id}/progress`),
  assign: (data: AssignSubscriptionRequest) => post<AdminSubscription>('/admin/subscriptions/assign', data),
  bulkAssign: (data: BulkAssignSubscriptionRequest) => post('/admin/subscriptions/bulk-assign', data),
  extend: (id: number, data: ExtendSubscriptionRequest) => post(`/admin/subscriptions/${id}/extend`, data),
  revoke: (id: number) => del(`/admin/subscriptions/${id}`)
}

// ============================================
// Ops API
// ============================================
export const adminOpsApi = {
  getConcurrency: () => get<ConcurrencyStats>('/admin/ops/concurrency'),
  getAccountAvailability: () => get<AccountAvailability[]>('/admin/ops/account-availability'),
  getRealtimeTraffic: () => get<RealtimeTraffic[]>('/admin/ops/realtime-traffic'),

  // Alert Rules
  getAlertRules: () => get<AlertRule[]>('/admin/ops/alert-rules'),
  createAlertRule: (data: CreateAlertRuleRequest) => post<AlertRule>('/admin/ops/alert-rules', data),
  updateAlertRule: (id: number, data: UpdateAlertRuleRequest) => put<AlertRule>(`/admin/ops/alert-rules/${id}`, data),
  deleteAlertRule: (id: number) => del(`/admin/ops/alert-rules/${id}`),

  // Alert Events
  getAlertEvents: (params?: PaginationParams) => get<PaginatedResponse<AlertEvent>>('/admin/ops/alert-events', params),
  getAlertEvent: (id: number) => get<AlertEvent>(`/admin/ops/alert-events/${id}`),
  updateAlertEventStatus: (id: number, status: string) => put(`/admin/ops/alert-events/${id}/status`, { status }),

  // Alert Silences
  createAlertSilence: (ruleId: number, durationMinutes: number) =>
    post('/admin/ops/alert-silences', { rule_id: ruleId, duration_minutes: durationMinutes }),

  // Email Notification
  getEmailConfig: () => get<EmailNotificationConfig>('/admin/ops/email-notification/config'),
  updateEmailConfig: (data: EmailNotificationConfig) => put('/admin/ops/email-notification/config', data),

  // Runtime Settings
  getRuntimeAlert: () => get<RuntimeAlertSettings>('/admin/ops/runtime/alert'),
  updateRuntimeAlert: (data: RuntimeAlertSettings) => put('/admin/ops/runtime/alert', data),

  // Advanced Settings
  getAdvancedSettings: () => get('/admin/ops/advanced-settings'),
  updateAdvancedSettings: (data: any) => put('/admin/ops/advanced-settings', data),

  // Metric Thresholds
  getMetricThresholds: () => get<MetricThresholds>('/admin/ops/settings/metric-thresholds'),
  updateMetricThresholds: (data: MetricThresholds) => put('/admin/ops/settings/metric-thresholds', data),

  // Dashboard
  getDashboardOverview: () => get<OpsDashboardOverview>('/admin/ops/dashboard/overview'),
  getThroughputTrend: () => get<ThroughputTrendItem[]>('/admin/ops/dashboard/throughput-trend'),
  getLatencyHistogram: () => get<LatencyHistogramItem[]>('/admin/ops/dashboard/latency-histogram'),
  getErrorTrend: () => get<ErrorTrendItem[]>('/admin/ops/dashboard/error-trend'),
  getErrorDistribution: () => get<ErrorDistributionItem[]>('/admin/ops/dashboard/error-distribution'),

  // Error Logs
  getErrors: (params?: PaginationParams) => get<PaginatedResponse<ErrorLog>>('/admin/ops/errors', params),
  getError: (id: number) => get<ErrorLog>(`/admin/ops/errors/${id}`),
  getErrorRetries: (id: number) => get(`/admin/ops/errors/${id}/retries`),
  retryError: (id: number) => post(`/admin/ops/errors/${id}/retry`),
  resolveError: (id: number, resolved: boolean) => put(`/admin/ops/errors/${id}/resolve`, { resolved }),

  // Request Errors
  getRequestErrors: (params?: PaginationParams) => get<PaginatedResponse<RequestError>>('/admin/ops/request-errors', params),
  getRequestError: (id: number) => get<RequestError>(`/admin/ops/request-errors/${id}`),
  getRequestErrorUpstreamErrors: (id: number) => get<UpstreamError[]>(`/admin/ops/request-errors/${id}/upstream-errors`),
  retryRequestErrorClient: (id: number) => post(`/admin/ops/request-errors/${id}/retry-client`),
  retryRequestErrorUpstream: (id: number, idx: number) => post(`/admin/ops/request-errors/${id}/upstream-errors/${idx}/retry`),
  resolveRequestError: (id: number) => put(`/admin/ops/request-errors/${id}/resolve`),

  // Upstream Errors
  getUpstreamErrors: (params?: PaginationParams) => get<PaginatedResponse<UpstreamError>>('/admin/ops/upstream-errors', params),
  getUpstreamError: (id: number) => get<UpstreamError>(`/admin/ops/upstream-errors/${id}`),
  retryUpstreamError: (id: number) => post(`/admin/ops/upstream-errors/${id}/retry`),
  resolveUpstreamError: (id: number) => put(`/admin/ops/upstream-errors/${id}/resolve`),

  // Requests
  getRequests: (params?: PaginationParams) => get<PaginatedResponse<RequestDetail>>('/admin/ops/requests', params),

  // Cleanup Tasks
  getCleanupTasks: () => get<UsageCleanupTask[]>('/admin/usage/cleanup-tasks'),
  createCleanupTask: (data: CreateUsageCleanupTaskRequest) => post<UsageCleanupTask>('/admin/usage/cleanup-tasks', data),
  cancelCleanupTask: (id: number) => post(`/admin/usage/cleanup-tasks/${id}/cancel`)
}

// ============================================
// User Attributes API
// ============================================
export const adminUserAttributesApi = {
  list: () => get<UserAttributeDefinition[]>('/admin/user-attributes'),
  create: (data: CreateUserAttributeRequest) => post<UserAttributeDefinition>('/admin/user-attributes', data),
  update: (id: number, data: UpdateUserAttributeRequest) => put<UserAttributeDefinition>(`/admin/user-attributes/${id}`, data),
  delete: (id: number) => del(`/admin/user-attributes/${id}`),
  batchGet: (userIds: number[]) => post<Record<number, Record<string, any>>>('/admin/user-attributes/batch', { user_ids: userIds }),
  reorder: (ids: number[]) => put('/admin/user-attributes/reorder', { ids })
}

// ============================================
// System API
// ============================================
export const adminSystemApi = {
  getVersion: () => get<SystemVersion>('/admin/system/version'),
  checkUpdates: () => get<SystemUpdateInfo>('/admin/system/check-updates'),
  update: () => post('/admin/system/update'),
  rollback: () => post('/admin/system/rollback'),
  restart: () => post('/admin/system/restart')
}

// ============================================
// Usage Management API
// ============================================
export const adminUsageApi = {
  list: (params?: PaginationParams) => get<PaginatedResponse<UsageLog>>('/admin/usage', params),
  getStats: () => get('/admin/usage/stats'),
  searchUsers: (query: string) => get(`/admin/usage/search-users?query=${encodeURIComponent(query)}`),
  searchApiKeys: (query: string) => get(`/admin/usage/search-api-keys?query=${encodeURIComponent(query)}`)
}
