import { api } from './client';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  User,
} from '../types';

interface BackendAuthResponse {
  token?: string;
  access_token?: string;
  token_type?: string;
  user: User;
}

const normalizeAuthResponse = (response: BackendAuthResponse): LoginResponse => ({
  token: response.token || response.access_token || '',
  user: response.user,
});

export const authApi = {
  // Login
  login: async (data: LoginRequest) =>
    normalizeAuthResponse(await api.post<BackendAuthResponse>('/auth/login', data)),

  // Login with 2FA
  loginWith2FA: async (data: { email: string; password: string; code: string }) =>
    normalizeAuthResponse(await api.post<BackendAuthResponse>('/auth/login/2fa', data)),

  // Register
  register: async (data: RegisterRequest) =>
    normalizeAuthResponse(await api.post<BackendAuthResponse>('/auth/register', data)),

  // Get current user
  getMe: () =>
    api.get<User>('/auth/me'),

  // Forgot password
  forgotPassword: (data: ForgotPasswordRequest) =>
    api.post<void>('/auth/forgot-password', data),

  // Reset password
  resetPassword: (data: ResetPasswordRequest) =>
    api.post<void>('/auth/reset-password', data),

  // Send verify code
  sendVerifyCode: (email: string) =>
    api.post<void>('/auth/send-verify-code', { email }),

  // Validate promo code
  validatePromoCode: (code: string) =>
    api.post<{ valid: boolean; bonus_amount: number }>('/auth/validate-promo-code', { code }),

  // OAuth - LinuxDo (backend endpoint returns 302 redirect, not JSON)
  getLinuxDoAuthStartUrl: (redirectPath?: string) => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const startURL = new URL(`${baseURL.replace(/\/$/, '')}/auth/oauth/linuxdo/start`, window.location.origin);
    if (redirectPath) {
      startURL.searchParams.set('redirect', redirectPath);
    }
    return startURL.toString();
  },

  startLinuxDoOAuth: (redirectPath?: string) => {
    window.location.href = authApi.getLinuxDoAuthStartUrl(redirectPath);
  },
};
