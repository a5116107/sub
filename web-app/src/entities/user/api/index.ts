// User API functions
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { get, put, post } from '~/shared/api/client'
import type {
  User,
  UpdateProfileInput,
  ChangePasswordInput,
  TotpStatus,
  TotpSetupInput,
  TotpSetupData,
  TotpEnableInput,
  TotpDisableInput
} from '../model/types'

// API Keys
const USER_KEYS = {
  all: ['user'] as const,
  me: () => [...USER_KEYS.all, 'me'] as const,
  profile: () => [...USER_KEYS.all, 'profile'] as const,
  totpStatus: () => [...USER_KEYS.all, 'totp', 'status'] as const
}

// API functions
export const userApi = {
  getMe: () => get<User>('/auth/me'),
  getProfile: () => get<User>('/user/profile'),
  updateProfile: (data: UpdateProfileInput) => put<User>('/user', data),
  changePassword: (data: ChangePasswordInput) => put('/user/password', data),

  // TOTP
  getTotpStatus: () => get<TotpStatus>('/user/totp/status'),
  getVerificationMethod: () => get<string>('/user/totp/verification-method'),
  sendTotpCode: () => post<{ success: boolean }>('/user/totp/send-code'),
  setupTotp: (data: TotpSetupInput) => post<TotpSetupData>('/user/totp/setup', data),
  enableTotp: (data: TotpEnableInput) => post('/user/totp/enable', data),
  disableTotp: (data: TotpDisableInput) => post('/user/totp/disable', data)
}

// Composables
export function useMeQuery() {
  return useQuery({
    queryKey: USER_KEYS.me(),
    queryFn: () => userApi.getMe()
  })
}

export function useProfileQuery() {
  return useQuery({
    queryKey: USER_KEYS.profile(),
    queryFn: () => userApi.getProfile()
  })
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.all })
    }
  })
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: userApi.changePassword
  })
}

export function useTotpStatusQuery() {
  return useQuery({
    queryKey: USER_KEYS.totpStatus(),
    queryFn: () => userApi.getTotpStatus()
  })
}

export function useTotpSetupMutation() {
  return useMutation({
    mutationFn: userApi.setupTotp
  })
}

export function useTotpEnableMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.enableTotp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.totpStatus() })
    }
  })
}

export function useTotpDisableMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.disableTotp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.totpStatus() })
    }
  })
}
