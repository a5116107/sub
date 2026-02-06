import { http, HttpResponse } from 'msw';

const mockUser = {
  id: 1,
  email: 'demo@example.com',
  username: 'demo_user',
  role: 'admin',
  balance: 125.50,
  concurrency: 10,
  status: 'active',
  allowed_groups: [1, 2],
  created_at: '2024-01-15T08:30:00Z',
  updated_at: '2024-06-20T14:22:00Z',
};

const mockDashboardData = {
  user: {
    balance: 125.50,
    concurrency: 10,
  },
  stats: {
    today_requests: 15420,
    today_cost: 2.4567,
    month_requests: 456789,
    month_cost: 78.9012,
  },
  recent_usage: [
    { id: 1, model: 'claude-3-opus-20240229', total_cost: 0.0456, created_at: '2024-06-20T14:20:00Z' },
    { id: 2, model: 'gpt-4-turbo', total_cost: 0.0234, created_at: '2024-06-20T14:15:00Z' },
    { id: 3, model: 'claude-3-sonnet-20240229', total_cost: 0.0123, created_at: '2024-06-20T14:10:00Z' },
    { id: 4, model: 'gemini-1.5-pro', total_cost: 0.0089, created_at: '2024-06-20T14:05:00Z' },
    { id: 5, model: 'gpt-3.5-turbo', total_cost: 0.0034, created_at: '2024-06-20T14:00:00Z' },
  ],
  announcements: [
    { id: 1, title: 'New Claude 3.5 Sonnet model now available', type: 'important', created_at: '2024-06-19T10:00:00Z' },
    { id: 2, title: 'Scheduled maintenance on June 25th', type: 'info', created_at: '2024-06-18T08:00:00Z' },
    { id: 3, title: 'Balance top-up bonuses active', type: 'promo', created_at: '2024-06-17T12:00:00Z' },
  ],
};

const mockApiKeys = [
  {
    id: 1,
    user_id: 1,
    key: 'sk-abc123...xyz789',
    name: 'Development Key',
    status: 'active',
    group_id: 1,
    allow_balance: true,
    allow_subscription: true,
    subscription_strict: false,
    quota_used_usd: 45.67,
    quota_limit_usd: 100,
    expires_at: '2025-06-20T00:00:00Z',
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2024-06-20T00:00:00Z',
  },
  {
    id: 2,
    user_id: 1,
    key: 'sk-def456...uvw012',
    name: 'Production Key',
    status: 'active',
    group_id: 2,
    allow_balance: true,
    allow_subscription: false,
    subscription_strict: false,
    quota_used_usd: 12.34,
    quota_limit_usd: 50,
    expires_at: null,
    created_at: '2024-06-10T00:00:00Z',
    updated_at: '2024-06-20T00:00:00Z',
  },
];

const mockUsageSummary = {
  total_requests: 456789,
  total_cost: 78.9012,
  today_requests: 15420,
  today_cost: 2.4567,
};

const mockUsageLogs = {
  total: 45,
  data: [
    { id: 1, model: 'claude-3-opus-20240229', total_cost: 0.0456, created_at: '2024-06-20T14:20:00Z', input_tokens: 1200, output_tokens: 800 },
    { id: 2, model: 'gpt-4-turbo', total_cost: 0.0234, created_at: '2024-06-20T14:15:00Z', input_tokens: 800, output_tokens: 400 },
    { id: 3, model: 'claude-3-sonnet-20240229', total_cost: 0.0123, created_at: '2024-06-20T14:10:00Z', input_tokens: 600, output_tokens: 300 },
    { id: 4, model: 'gemini-1.5-pro', total_cost: 0.0089, created_at: '2024-06-20T14:05:00Z', input_tokens: 500, output_tokens: 250 },
    { id: 5, model: 'gpt-3.5-turbo', total_cost: 0.0034, created_at: '2024-06-20T14:00:00Z', input_tokens: 300, output_tokens: 150 },
  ],
};

const mockModelDistribution = [
  { model: 'claude-3-opus-20240229', count: 150, cost: 25.50 },
  { model: 'gpt-4-turbo', count: 200, cost: 18.75 },
  { model: 'claude-3-sonnet-20240229', count: 300, cost: 15.20 },
  { model: 'gemini-1.5-pro', count: 180, cost: 12.30 },
  { model: 'gpt-3.5-turbo', count: 450, cost: 7.15 },
];

// Mock subscriptions data
const mockSubscriptions = [
  {
    id: 1,
    user_id: 1,
    group_id: 1,
    starts_at: '2024-06-01T00:00:00Z',
    expires_at: '2024-07-01T00:00:00Z',
    status: 'active',
    daily_usage_usd: 2.5,
    weekly_usage_usd: 15.0,
    monthly_usage_usd: 45.0,
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2024-06-20T00:00:00Z',
    group: {
      id: 1,
      name: 'Claude Pro',
      description: 'Claude Pro subscription',
      platform: 'claude',
      rate_multiplier: 1,
      is_exclusive: false,
      status: 'active',
      subscription_type: 'monthly',
      daily_limit_usd: 10,
      weekly_limit_usd: 50,
      monthly_limit_usd: 200,
      user_concurrency: 5,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
  {
    id: 2,
    user_id: 1,
    group_id: 2,
    starts_at: '2024-05-01T00:00:00Z',
    expires_at: '2024-05-31T00:00:00Z',
    status: 'expired',
    daily_usage_usd: 8.0,
    weekly_usage_usd: 40.0,
    monthly_usage_usd: 150.0,
    created_at: '2024-05-01T00:00:00Z',
    updated_at: '2024-05-31T00:00:00Z',
    group: {
      id: 2,
      name: 'GPT-4 Basic',
      description: 'GPT-4 Basic subscription',
      platform: 'openai',
      rate_multiplier: 1.2,
      is_exclusive: false,
      status: 'active',
      subscription_type: 'monthly',
      daily_limit_usd: 15,
      weekly_limit_usd: 75,
      monthly_limit_usd: 300,
      user_concurrency: 3,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
];

// Mock redeem history
const mockRedeemHistory = [
  {
    id: 1,
    code: 'XXXX-XXXX-1234',
    type: 'balance',
    value: 10.00,
    used_at: '2024-06-15T10:30:00Z',
  },
  {
    id: 2,
    code: 'XXXX-XXXX-5678',
    type: 'subscription',
    value: 30,
    used_at: '2024-06-01T08:00:00Z',
  },
];

// Mock groups
const mockGroups = [
  {
    id: 1,
    name: 'Claude Pro',
    description: 'Claude Pro subscription with high limits',
    platform: 'claude',
    rate_multiplier: 1,
    is_exclusive: false,
    status: 'active',
    subscription_type: 'monthly',
    daily_limit_usd: 10,
    weekly_limit_usd: 50,
    monthly_limit_usd: 200,
    user_concurrency: 5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'GPT-4 Basic',
    description: 'GPT-4 Basic subscription',
    platform: 'openai',
    rate_multiplier: 1.2,
    is_exclusive: false,
    status: 'active',
    subscription_type: 'monthly',
    daily_limit_usd: 15,
    weekly_limit_usd: 75,
    monthly_limit_usd: 300,
    user_concurrency: 3,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'Gemini Enterprise',
    description: 'Gemini Enterprise with exclusive access',
    platform: 'gemini',
    rate_multiplier: 0.8,
    is_exclusive: true,
    status: 'active',
    subscription_type: 'weekly',
    daily_limit_usd: 20,
    weekly_limit_usd: 100,
    monthly_limit_usd: 400,
    user_concurrency: 10,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// Mock accounts
const mockAccounts = [
  {
    id: 1,
    name: 'Claude API Key 1',
    notes: 'Primary Claude account',
    platform: 'claude',
    type: 'api_key',
    credentials: { api_key: 'sk-ant-***' },
    extra: {},
    proxy_id: null,
    concurrency: 10,
    priority: 0,
    rate_multiplier: 1,
    status: 'active',
    error_message: '',
    last_used_at: '2024-06-20T14:00:00Z',
    expires_at: null,
    auto_pause_on_expired: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-20T00:00:00Z',
  },
  {
    id: 2,
    name: 'OpenAI Key 1',
    notes: 'GPT-4 access',
    platform: 'openai',
    type: 'api_key',
    credentials: { api_key: 'sk-***' },
    extra: {},
    proxy_id: null,
    concurrency: 5,
    priority: 1,
    rate_multiplier: 1,
    status: 'active',
    error_message: '',
    last_used_at: '2024-06-20T13:30:00Z',
    expires_at: null,
    auto_pause_on_expired: true,
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-06-20T00:00:00Z',
  },
  {
    id: 3,
    name: 'Gemini OAuth',
    notes: 'Gemini OAuth account',
    platform: 'gemini',
    type: 'oauth',
    credentials: { refresh_token: '***' },
    extra: {},
    proxy_id: 1,
    concurrency: 3,
    priority: 0,
    rate_multiplier: 0.9,
    status: 'error',
    error_message: 'Token expired',
    last_used_at: '2024-06-19T10:00:00Z',
    expires_at: 1719792000,
    auto_pause_on_expired: true,
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2024-06-19T00:00:00Z',
  },
];

export const handlers = [
  // Auth endpoints
  http.post('/api/v1/auth/login', async () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: {
        token: 'mock_jwt_token_' + Date.now(),
        user: mockUser,
      },
    });
  }),

  http.get('/api/v1/auth/me', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: mockUser,
    });
  }),

  // Dashboard
  http.get('/api/v1/user/dashboard', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: mockDashboardData,
    });
  }),

  // API Keys
  http.get('/api/v1/user/api-keys', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: mockApiKeys,
    });
  }),

  http.post('/api/v1/user/api-keys', async ({ request }) => {
    const body = await request.json() as { name: string; group_id?: number };
    const newKey = {
      id: Date.now(),
      user_id: 1,
      key: 'sk-' + Math.random().toString(36).substring(2, 15) + '...' + Math.random().toString(36).substring(2, 8),
      name: body.name,
      status: 'active',
      group_id: body.group_id || null,
      allow_balance: true,
      allow_subscription: true,
      subscription_strict: false,
      quota_used_usd: 0,
      quota_limit_usd: null,
      expires_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: newKey,
    });
  }),

  http.delete('/api/v1/user/api-keys/:id', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: null,
    });
  }),

  // Usage
  http.get('/api/v1/user/usage/summary', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: mockUsageSummary,
    });
  }),

  http.get('/api/v1/user/usage', ({ request }) => {
    const url = new URL(request.url);
    const pageSize = parseInt(url.searchParams.get('page_size') || '10');
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: {
        ...mockUsageLogs,
        page_size: pageSize,
      },
    });
  }),

  http.get('/api/v1/user/usage/models', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: mockModelDistribution,
    });
  }),

  // Admin endpoints
  http.get('/api/v1/admin/dashboard/stats', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: {
        total_users: 1234,
        total_accounts: 567,
        total_requests_today: 789012,
        total_cost_today: 1234.56,
        active_subscriptions: 89,
        system_status: 'healthy',
      },
    });
  }),

  http.get('/api/v1/admin/dashboard/trends', () => {
    const trends = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toISOString().split('T')[0],
        requests: Math.floor(Math.random() * 100000) + 50000,
        cost: parseFloat((Math.random() * 200 + 100).toFixed(2)),
        new_users: Math.floor(Math.random() * 50) + 10,
      };
    });
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: trends,
    });
  }),

  // User Profile
  http.get('/api/v1/user/profile', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: mockUser,
    });
  }),

  http.put('/api/v1/user', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: { ...mockUser, username: 'updated_user' },
    });
  }),

  http.put('/api/v1/user/password', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: null,
    });
  }),

  // TOTP
  http.get('/api/v1/user/totp/status', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: { enabled: false },
    });
  }),

  http.post('/api/v1/user/totp/setup', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: {
        secret: 'JBSWY3DPEHPK3PXP',
        qr_code: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        backup_codes: ['12345678', '87654321', '11112222', '33334444'],
      },
    });
  }),

  http.post('/api/v1/user/totp/enable', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: null,
    });
  }),

  http.post('/api/v1/user/totp/disable', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: null,
    });
  }),

  http.get('/api/v1/admin/users', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: {
        items: Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          email: `user${i + 1}@example.com`,
          username: `user${i + 1}`,
          role: i === 0 ? 'admin' : 'user',
          balance: Math.random() * 100,
          status: i === 5 ? 'banned' : 'active',
          concurrency: 5,
          allowed_groups: [1, 2],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-06-01T00:00:00Z',
        })),
        total: 100,
        page: 1,
        page_size: 10,
      },
    });
  }),

  // User subscriptions
  http.get('/api/v1/user/subscriptions', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: mockSubscriptions,
    });
  }),

  http.get('/api/v1/user/subscriptions/:id/progress', ({ params }) => {
    const sub = mockSubscriptions.find(s => s.id === Number(params.id));
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: {
        subscription: sub,
        daily_usage: sub?.daily_usage_usd || 0,
        daily_limit: sub?.group?.daily_limit_usd || 10,
        weekly_usage: sub?.weekly_usage_usd || 0,
        weekly_limit: sub?.group?.weekly_limit_usd || 50,
        monthly_usage: sub?.monthly_usage_usd || 0,
        monthly_limit: sub?.group?.monthly_limit_usd || 200,
      },
    });
  }),

  // Redeem
  http.post('/api/v1/user/redeem', async ({ request }) => {
    const body = await request.json() as { code: string };
    const isValid = body.code && body.code.length >= 8;
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: {
        success: isValid,
        type: 'balance',
        value: isValid ? 10.00 : 0,
        message: isValid ? 'Code redeemed successfully' : 'Invalid code',
      },
    });
  }),

  http.get('/api/v1/user/redeem/history', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: mockRedeemHistory,
    });
  }),

  // Admin Groups
  http.get('/api/v1/admin/groups', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: {
        items: mockGroups,
        total: mockGroups.length,
        page: 1,
        page_size: 10,
      },
    });
  }),

  http.post('/api/v1/admin/groups', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: { id: Date.now(), ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    });
  }),

  http.put('/api/v1/admin/groups/:id', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: { ...body, updated_at: new Date().toISOString() },
    });
  }),

  http.delete('/api/v1/admin/groups/:id', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: null,
    });
  }),

  http.get('/api/v1/admin/groups/:id/stats', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: {
        total_accounts: 5,
        active_accounts: 4,
        total_requests_today: 12345,
        total_cost_today: 45.67,
        active_subscriptions: 23,
      },
    });
  }),

  // Admin Accounts
  http.get('/api/v1/admin/accounts', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: {
        items: mockAccounts,
        total: mockAccounts.length,
        page: 1,
        page_size: 10,
      },
    });
  }),

  http.post('/api/v1/admin/accounts', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: { id: Date.now(), ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    });
  }),

  http.put('/api/v1/admin/accounts/:id', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: { ...body, updated_at: new Date().toISOString() },
    });
  }),

  http.delete('/api/v1/admin/accounts/:id', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: null,
    });
  }),

  http.post('/api/v1/admin/accounts/:id/test', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: { success: true, message: 'Account test passed' },
    });
  }),

  http.post('/api/v1/admin/accounts/:id/refresh', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: { success: true, message: 'Token refreshed successfully' },
    });
  }),

  http.put('/api/v1/admin/accounts/:id/status', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: null,
    });
  }),

  // Admin User actions
  http.put('/api/v1/admin/users/:id/status', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: null,
    });
  }),

  http.put('/api/v1/admin/users/:id/role', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: null,
    });
  }),

  http.post('/api/v1/admin/users/:id/balance', async ({ request }) => {
    const body = await request.json() as { amount: number };
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: { new_balance: 100 + (body.amount || 0) },
    });
  }),

  http.delete('/api/v1/admin/users/:id', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: null,
    });
  }),
];
