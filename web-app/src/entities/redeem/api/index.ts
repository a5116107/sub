// Redeem API functions
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { get, post } from '~/shared/api/client'
import type { RedeemRequest, RedeemResponse, RedeemHistoryItem, RedeemHistoryParams } from '../model/types'
import type { PaginatedResponse } from '~/shared/types'

// Query Keys
export const REDEEM_KEYS = {
  all: ['redeem'] as const,
  history: (params?: RedeemHistoryParams) => [...REDEEM_KEYS.all, 'history', params] as const
}

// API functions
export const redeemApi = {
  // Redeem a code
  redeem: (data: RedeemRequest) =>
    post<RedeemResponse>('/redeem', data),

  // Get redeem history
  getHistory: (params?: RedeemHistoryParams) =>
    get<PaginatedResponse<RedeemHistoryItem>>('/redeem/history', params)
}

// Composables
export function useRedeemMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: redeemApi.redeem,
    onSuccess: () => {
      // Invalidate history and user balance
      queryClient.invalidateQueries({ queryKey: REDEEM_KEYS.all })
      queryClient.invalidateQueries({ queryKey: ['user'] })
    }
  })
}

export function useRedeemHistoryQuery(params?: RedeemHistoryParams) {
  return useQuery({
    queryKey: REDEEM_KEYS.history(params),
    queryFn: () => redeemApi.getHistory(params)
  })
}
