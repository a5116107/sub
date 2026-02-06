// Payment entity types

export interface PaymentProvider {
  id: string
  name: string
  enabled: boolean
  channels?: PaymentChannel[]
  icon?: string
}

export interface PaymentChannel {
  id: string
  name: string
  description?: string
  min_amount?: number
  max_amount?: number
  fee?: number
  fee_percent?: number
}

export interface PaymentOrder {
  id: string
  order_no: string
  user_id: number
  provider: string
  channel?: string
  currency: string
  amount: number
  status: 'pending' | 'paid' | 'failed' | 'canceled' | 'expired'
  description?: string
  checkout_url?: string
  paid_at?: string
  expires_at?: string
  created_at: string
  updated_at: string
}

export interface CreateOrderRequest {
  amount: number
  provider: string
  channel?: string
}

export interface CreateOrderResponse {
  order: PaymentOrder
  checkout_url: string
}

export interface PaymentOrderListParams {
  page?: number
  page_size?: number
  status?: string
}
