// Auth entity types

export interface LoginRequest {
  email: string
  password: string
  turnstile_token?: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: {
    id: number
    email: string
    username: string
    role: 'user' | 'admin'
  }
  // 2FA response
  requires_2fa?: boolean
  temp_token?: string
  user_email_masked?: string
}

export interface Login2FARequest {
  temp_token: string
  totp_code: string
}

export interface RegisterRequest {
  email: string
  password: string
  verify_code?: string
  turnstile_token?: string
  promo_code?: string
}

export interface ForgotPasswordRequest {
  email: string
  turnstile_token?: string
}

export interface ResetPasswordRequest {
  email: string
  token: string
  new_password: string
}

export interface SendVerifyCodeRequest {
  email: string
  turnstile_token?: string
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
