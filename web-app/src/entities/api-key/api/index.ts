// API Key API functions
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { get, post, put, del } from '~/shared/api/client'
import type { APIKey, CreateAPIKeyInput, UpdateAPIKeyInput } from '../model/types'
import type { PaginatedResponse, PaginationParams } from '~/shared/types'

// Query Keys
const API_KEY_KEYS = {
  all: ['api-keys'] as const,
  list: (params?: PaginationParams) => [...API_KEY_KEYS.all, 'list', params] as const,
  detail: (id: number) => [...API_KEY_KEYS.all, 'detail', id] as const
}

// API functions
export const apiKeyApi = {
  list: (params?: PaginationParams) =>
    get<PaginatedResponse<APIKey>>('/keys', params),
  get: (id: number) => get<APIKey>(`/keys/${id}`),
  create: (data: CreateAPIKeyInput) => post<APIKey>('/keys', data),
  update: (id: number, data: UpdateAPIKeyInput) => put<APIKey>(`/keys/${id}`, data),
  delete: (id: number) => del(`/keys/${id}`)
}

// Composables
export function useApiKeysQuery(params?: PaginationParams) {
  return useQuery({
    queryKey: API_KEY_KEYS.list(params),
    queryFn: () => apiKeyApi.list(params)
  })
}

export function useApiKeyQuery(id: number) {
  return useQuery({
    queryKey: API_KEY_KEYS.detail(id),
    queryFn: () => apiKeyApi.get(id),
    enabled: !!id
  })
}

export function useCreateApiKeyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: apiKeyApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.all })
    }
  })
}

export function useUpdateApiKeyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAPIKeyInput }) =>
      apiKeyApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.all })
    }
  })
}

export function useDeleteApiKeyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: apiKeyApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.all })
    }
  })
}
