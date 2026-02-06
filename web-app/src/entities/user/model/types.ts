// User entity types

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

export type UserProfile = User

export interface UpdateProfileInput {
  username?: string
}

export interface ChangePasswordInput {
  old_password: string
  new_password: string
}

export interface TotpStatus {
  enabled: boolean
  enabled_at?: number
  feature_enabled: boolean
}

export interface TotpSetupInput {
  email_code: string
  password: string
}

export interface TotpSetupData {
  secret: string
  qr_code_url: string
  setup_token: string
  countdown: number
}

export interface TotpEnableInput {
  totp_code: string
  setup_token: string
}

export interface TotpDisableInput {
  email_code: string
  password: string
}
