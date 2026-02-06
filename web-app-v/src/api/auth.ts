import { api } from './client';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  User,
  TOTPSetupResponse,
} from '../types';

export const authApi = {
  // Login
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', data),

  // Login with 2FA
  loginWith2FA: (data: { email: string; password: string; code: string }) =>
    api.post<LoginResponse>('/auth/login/2fa', data),

  // Register
  register: (data: RegisterRequest) =>
    api.post<LoginResponse>('/auth/register', data),

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

  // OAuth - LinuxDo
  getLinuxDoAuthUrl: () =>
    api.get<{ url: string }>('/auth/oauth/linuxdo/start'),

  // Change password
  changePassword: (data: { old_password: string; new_password: string }) =>
    api.post<void>('/auth/change-password', data),

  // TOTP Setup
  setupTOTP: () =>
    api.post<TOTPSetupResponse>('/auth/totp/setup', {}),

  // Enable TOTP
  enableTOTP: (data: { code: string; secret: string }) =>
    api.post<void>('/auth/totp/enable', data),

  // Disable TOTP
  disableTOTP: (data: { code: string; password: string }) =>
    api.post<void>('/auth/totp/disable', data),

  // Verify TOTP
  verifyTOTP: (code: string) =>
    api.post<void>('/auth/totp/verify', { code }),
};
