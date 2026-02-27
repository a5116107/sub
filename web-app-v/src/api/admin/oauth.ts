import { api } from '../client';

// ==================== OpenAI OAuth ====================

export interface OpenAIOAuthResponse {
  url: string;
  state: string;
}

export interface OpenAITokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export const adminOpenAIOAuthApi = {
  // Generate auth URL
  generateAuthUrl: (data?: { redirect_uri?: string }) =>
    api.post<OpenAIOAuthResponse>('/admin/openai/generate-auth-url', data),

  // Exchange code
  exchangeCode: (code: string, state?: string) =>
    api.post<OpenAITokenResponse>('/admin/openai/exchange-code', { code, state }),

  // Refresh token
  refreshToken: (refresh_token: string) =>
    api.post<OpenAITokenResponse>('/admin/openai/refresh-token', { refresh_token }),

  // Refresh account token
  refreshAccount: (id: number) =>
    api.post<void>(`/admin/openai/accounts/${id}/refresh`),

  // Create from OAuth
  createFromOAuth: (data: {
    access_token: string;
    refresh_token?: string;
    expires_at?: string;
    name?: string;
    group_id?: number;
  }) =>
    api.post<{ id: number; name: string }>('/admin/openai/create-from-oauth', data),
};

// ==================== Qwen OAuth ====================

export interface QwenDeviceAuthResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface QwenPollResponse {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
}

export const adminQwenOAuthApi = {
  // Start device auth
  startDeviceAuth: () =>
    api.post<QwenDeviceAuthResponse>('/admin/qwen/device/start'),

  // Poll device auth
  pollDeviceAuth: (device_code: string) =>
    api.post<QwenPollResponse>('/admin/qwen/device/poll', { device_code }),

  // Refresh token
  refreshToken: (refresh_token: string) =>
    api.post<{ access_token: string; expires_in: number }>('/admin/qwen/refresh-token', { refresh_token }),

  // Refresh account token
  refreshAccount: (id: number) =>
    api.post<void>(`/admin/qwen/accounts/${id}/refresh`),

  // Create from device auth
  createFromDevice: (data: {
    access_token: string;
    refresh_token?: string;
    expires_at?: string;
    name?: string;
    group_id?: number;
  }) =>
    api.post<{ id: number; name: string }>('/admin/qwen/create-from-device', data),
};

// ==================== Gemini OAuth ====================

export interface GeminiOAuthResponse {
  url: string;
  state: string;
}

export interface GeminiCapabilitiesResponse {
  models: string[];
  features: string[];
}

export const adminGeminiOAuthApi = {
  // Generate auth URL
  generateAuthUrl: (data?: { redirect_uri?: string }) =>
    api.post<GeminiOAuthResponse>('/admin/gemini/oauth/auth-url', data),

  // Exchange code
  exchangeCode: (code: string, state?: string) =>
    api.post<{ access_token: string; expires_in?: number }>('/admin/gemini/oauth/exchange-code', { code, state }),

  // Get capabilities
  getCapabilities: () =>
    api.get<GeminiCapabilitiesResponse>('/admin/gemini/oauth/capabilities'),
};

// ==================== Antigravity OAuth ====================

export interface AntigravityOAuthResponse {
  url: string;
  state: string;
}

export const adminAntigravityOAuthApi = {
  // Generate auth URL
  generateAuthUrl: (data?: { redirect_uri?: string }) =>
    api.post<AntigravityOAuthResponse>('/admin/antigravity/oauth/auth-url', data),

  // Exchange code
  exchangeCode: (code: string, state?: string) =>
    api.post<{ access_token: string; refresh_token?: string; expires_in?: number }>('/admin/antigravity/oauth/exchange-code', { code, state }),
};

// ==================== Claude OAuth (Anthropic) ====================

export interface ClaudeOAuthResponse {
  url: string;
  state: string;
}

export const adminClaudeOAuthApi = {
  // Generate auth URL
  generateAuthUrl: (data?: { redirect_uri?: string }) =>
    api.post<ClaudeOAuthResponse>('/admin/accounts/generate-auth-url', data),

  // Generate setup token URL
  generateSetupTokenUrl: (data?: { redirect_uri?: string }) =>
    api.post<ClaudeOAuthResponse>('/admin/accounts/generate-setup-token-url', data),

  // Exchange code
  exchangeCode: (code: string, state?: string) =>
    api.post<void>('/admin/accounts/exchange-code', { code, state }),

  // Exchange setup token code
  exchangeSetupTokenCode: (code: string, state?: string) =>
    api.post<void>('/admin/accounts/exchange-setup-token-code', { code, state }),

  // Cookie auth
  cookieAuth: (data: { cookies: string; account_id?: number }) =>
    api.post<void>('/admin/accounts/cookie-auth', data),

  // Setup token cookie auth
  setupTokenCookieAuth: (data: { cookies: string; account_id?: number }) =>
    api.post<void>('/admin/accounts/setup-token-cookie-auth', data),
};
