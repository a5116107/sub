/**
 * Payment API endpoints
 * Supports top-up order creation and status query
 */

import { apiClient } from './client'

export interface PaymentProviderInfo {
  provider: string
  channels?: string[]
}

export interface CreateTopUpRequest {
  amount: number
  provider: string
  channel?: string
}

export interface CreateTopUpResponse {
  order_id: number
  order_no: string
  provider: string
  channel?: string
  currency: string
  amount: number
  status: string
  checkout_url: string
  expires_at?: string
}

export interface PaymentOrder {
  id: number
  order_no: string
  provider: string
  channel?: string
  currency: string
  amount: number
  status: string
  description?: string
  paid_at?: string
  expires_at?: string
  created_at: string
  updated_at: string
}

export async function listProviders(): Promise<PaymentProviderInfo[]> {
  const { data } = await apiClient.get<{ providers: PaymentProviderInfo[] }>('/payments/providers')
  return data.providers || []
}

export async function createTopUp(payload: CreateTopUpRequest): Promise<CreateTopUpResponse> {
  const { data } = await apiClient.post<CreateTopUpResponse>('/payments/orders', payload)
  return data
}

export async function getOrder(id: number): Promise<PaymentOrder> {
  const { data } = await apiClient.get<PaymentOrder>(`/payments/orders/${id}`)
  return data
}

export const paymentsAPI = {
  listProviders,
  createTopUp,
  getOrder
}

export default paymentsAPI
