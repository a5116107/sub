// Payment API functions
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { get, post } from '~/shared/api/client'
import type {
  PaymentProvider,
  PaymentOrder,
  CreateOrderRequest,
  CreateOrderResponse,
  PaymentOrderListParams
} from '../model/types'
import type { PaginatedResponse } from '~/shared/types'

// Query Keys
export const PAYMENT_KEYS = {
  all: ['payments'] as const,
  providers: () => [...PAYMENT_KEYS.all, 'providers'] as const,
  orders: (params?: PaymentOrderListParams) => [...PAYMENT_KEYS.all, 'orders', params] as const,
  order: (id: string) => [...PAYMENT_KEYS.all, 'order', id] as const
}

// API functions
export const paymentApi = {
  // Get available payment providers
  getProviders: () =>
    get<PaymentProvider[]>('/payments/providers'),

  // Create a new order
  createOrder: (data: CreateOrderRequest) =>
    post<CreateOrderResponse>('/payments/orders', data),

  // Get order list
  getOrders: (params?: PaymentOrderListParams) =>
    get<PaginatedResponse<PaymentOrder>>('/payments/orders', params),

  // Get single order
  getOrder: (id: string) =>
    get<PaymentOrder>(`/payments/orders/${id}`)
}

// Composables
export function usePaymentProvidersQuery() {
  return useQuery({
    queryKey: PAYMENT_KEYS.providers(),
    queryFn: () => paymentApi.getProviders(),
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
}

export function usePaymentOrdersQuery(params?: PaymentOrderListParams) {
  return useQuery({
    queryKey: PAYMENT_KEYS.orders(params),
    queryFn: () => paymentApi.getOrders(params)
  })
}

export function usePaymentOrderQuery(id: string) {
  return useQuery({
    queryKey: PAYMENT_KEYS.order(id),
    queryFn: () => paymentApi.getOrder(id),
    enabled: !!id
  })
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: paymentApi.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.orders() })
    }
  })
}
