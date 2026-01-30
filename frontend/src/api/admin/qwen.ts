/**
 * Admin Qwen API endpoints
 * Handles Qwen OAuth device flow for administrators
 */

import { apiClient } from '../client'
import type { Account } from '@/types'

export interface QwenDeviceFlowResult {
  session_id: string
  user_code: string
  verification_uri: string
  verification_uri_complete: string
  expires_in: number
  interval: number
}

export interface QwenTokenInfo {
  access_token: string
  refresh_token?: string
  token_type: string
  resource_url?: string
  expires_in: number
  expires_at: number
}

export interface QwenStartDeviceFlowRequest {
  proxy_id?: number
}

export interface QwenPollDeviceFlowRequest {
  session_id: string
}

export interface QwenCreateFromDeviceFlowRequest {
  session_id: string
  name?: string
  proxy_id?: number
  concurrency?: number
  priority?: number
  group_ids?: number[]
}

export interface QwenRefreshTokenRequest {
  refresh_token: string
  proxy_id?: number
}

export async function startDeviceFlow(
  payload: QwenStartDeviceFlowRequest = {}
): Promise<QwenDeviceFlowResult> {
  const { data } = await apiClient.post<QwenDeviceFlowResult>('/admin/qwen/device/start', payload)
  return data
}

export async function pollDeviceFlowToken(
  payload: QwenPollDeviceFlowRequest
): Promise<QwenTokenInfo> {
  const { data } = await apiClient.post<QwenTokenInfo>('/admin/qwen/device/poll', payload)
  return data
}

export async function refreshToken(payload: QwenRefreshTokenRequest): Promise<QwenTokenInfo> {
  const { data } = await apiClient.post<QwenTokenInfo>('/admin/qwen/refresh-token', payload)
  return data
}

export async function refreshAccountToken(id: number): Promise<Account> {
  const { data } = await apiClient.post<Account>(`/admin/qwen/accounts/${id}/refresh`)
  return data
}

export async function createFromDeviceFlow(
  payload: QwenCreateFromDeviceFlowRequest
): Promise<Account> {
  const { data } = await apiClient.post<Account>('/admin/qwen/create-from-device', payload)
  return data
}

export default {
  startDeviceFlow,
  pollDeviceFlowToken,
  refreshToken,
  refreshAccountToken,
  createFromDeviceFlow
}

