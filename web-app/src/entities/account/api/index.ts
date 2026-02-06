// Account API functions (Admin only)
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { get, post, put, del } from '~/shared/api/client'
import type { Account, CreateAccountInput, UpdateAccountInput, AccountStats } from '../model/types'
import type { PaginatedResponse, PaginationParams } from '~/shared/types'

// Query Keys
const ACCOUNT_KEYS = {
  all: ['accounts'] as const,
  list: (params?: PaginationParams) => [...ACCOUNT_KEYS.all, 'list', params] as const,
  detail: (id: number) => [...ACCOUNT_KEYS.all, 'detail', id] as const,
  stats: (id: number) => [...ACCOUNT_KEYS.all, 'stats', id] as const
}

// API functions
export const accountApi = {
  list: (params?: PaginationParams) =>
    get<PaginatedResponse<Account>>('/admin/accounts', params),
  get: (id: number) => get<Account>(`/admin/accounts/${id}`),
  create: (data: CreateAccountInput) => post<Account>('/admin/accounts', data),
  update: (id: number, data: UpdateAccountInput) => put<Account>(`/admin/accounts/${id}`, data),
  delete: (id: number) => del(`/admin/accounts/${id}`),
  test: (id: number) => post(`/admin/accounts/${id}/test`),
  refresh: (id: number) => post(`/admin/accounts/${id}/refresh`),
  getStats: (id: number) => get<AccountStats>(`/admin/accounts/${id}/stats`)
}

// Composables
export function useAccountsQuery(params?: PaginationParams) {
  return useQuery({
    queryKey: ACCOUNT_KEYS.list(params),
    queryFn: () => accountApi.list(params)
  })
}

export function useAccountQuery(id: number) {
  return useQuery({
    queryKey: ACCOUNT_KEYS.detail(id),
    queryFn: () => accountApi.get(id),
    enabled: !!id
  })
}

export function useAccountStatsQuery(id: number) {
  return useQuery({
    queryKey: ACCOUNT_KEYS.stats(id),
    queryFn: () => accountApi.getStats(id),
    enabled: !!id
  })
}

export function useCreateAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: accountApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNT_KEYS.all })
    }
  })
}

export function useUpdateAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAccountInput }) =>
      accountApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ACCOUNT_KEYS.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: ACCOUNT_KEYS.all })
    }
  })
}

export function useDeleteAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: accountApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNT_KEYS.all })
    }
  })
}
