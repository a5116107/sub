// Redeem entity types

export interface RedeemRequest {
  code: string
}

export interface RedeemResponse {
  success: boolean
  type: 'balance' | 'concurrency' | 'subscription'
  amount?: number
  days?: number
  group_id?: number
  group_name?: string
  message?: string
}

export interface RedeemHistoryItem {
  id: number
  code: string
  type: 'balance' | 'concurrency' | 'subscription'
  amount?: number
  days?: number
  group_id?: number
  group_name?: string
  created_at: string
}

export interface RedeemHistoryParams {
  page?: number
  page_size?: number
}
