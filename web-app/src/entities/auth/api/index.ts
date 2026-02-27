// Auth API functions
import { useMutation } from '@tanstack/vue-query'
import { post } from '~/shared/api/client'
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  Login2FARequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  SendVerifyCodeRequest,
  SendVerifyCodeResponse,
  ValidatePromoCodeRequest,
  ValidatePromoCodeResponse
} from '../model/types'

// API functions
export const authApi = {
  // Login
  login: (data: LoginRequest) =>
    post<LoginResponse>('/auth/login', data),

  // Login with 2FA
  login2FA: (data: Login2FARequest) =>
    post<LoginResponse>('/auth/login/2fa', data),

  // Register
  register: (data: RegisterRequest) =>
    post<LoginResponse>('/auth/register', data),

  // Forgot password
  forgotPassword: (data: ForgotPasswordRequest) =>
    post<{ message: string }>('/auth/forgot-password', data),

  // Reset password
  resetPassword: (data: ResetPasswordRequest) =>
    post<{ message: string }>('/auth/reset-password', data),

  // Send verification code
  sendVerifyCode: (data: SendVerifyCodeRequest) =>
    post<SendVerifyCodeResponse>('/auth/send-verify-code', data),

  // Validate promo code
  validatePromoCode: (data: ValidatePromoCodeRequest) =>
    post<ValidatePromoCodeResponse>('/auth/validate-promo-code', data),

  // Logout is frontend-local (backend has no /auth/logout endpoint)
  logout: async () => undefined
}

// Composables
export function useLoginMutation() {
  return useMutation({
    mutationFn: authApi.login
  })
}

export function useLogin2FAMutation() {
  return useMutation({
    mutationFn: authApi.login2FA
  })
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: authApi.register
  })
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: authApi.forgotPassword
  })
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: authApi.resetPassword
  })
}

export function useSendVerifyCodeMutation() {
  return useMutation({
    mutationFn: authApi.sendVerifyCode
  })
}

export function useValidatePromoCodeMutation() {
  return useMutation({
    mutationFn: authApi.validatePromoCode
  })
}
