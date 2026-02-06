/**
 * Admin OpenAI API endpoints
 * Handles OpenAI OAuth flows and refresh helpers for administrators
 */

import { apiClient } from '../client'
import type { Account } from '@/types'

export interface OpenAIGenerateAuthUrlRequest {
  proxy_id?: number
  redirect_uri?: string
}

export interface OpenAIGenerateAuthUrlResponse {
  auth_url: string
  session_id: string
}

export interface OpenAIExchangeCodeRequest {
  session_id: string
  code: string
  redirect_uri?: string
  proxy_id?: number
}

export interface OpenAITokenInfo {
  access_token?: string
  refresh_token?: string
  id_token?: string
  token_type?: string
  expires_in?: number
  expires_at?: number
  scope?: string
  email?: string
  name?: string
  chatgpt_account_id?: string
  chatgpt_user_id?: string
  organization_id?: string
  [key: string]: unknown
}

export interface OpenAIRefreshTokenRequest {
  refresh_token: string
  proxy_id?: number
}

export interface OpenAICreateFromOAuthRequest {
  session_id: string
  code: string
  redirect_uri?: string
  proxy_id?: number
  name?: string
  concurrency?: number
  priority?: number
  group_ids?: number[]
}

export async function generateAuthUrl(
  payload: OpenAIGenerateAuthUrlRequest = {}
): Promise<OpenAIGenerateAuthUrlResponse> {
  const { data } = await apiClient.post<OpenAIGenerateAuthUrlResponse>(
    '/admin/openai/generate-auth-url',
    payload
  )
  return data
}

export async function exchangeCode(payload: OpenAIExchangeCodeRequest): Promise<OpenAITokenInfo> {
  const { data } = await apiClient.post<OpenAITokenInfo>('/admin/openai/exchange-code', payload)
  return data
}

export async function refreshToken(payload: OpenAIRefreshTokenRequest): Promise<OpenAITokenInfo> {
  const { data } = await apiClient.post<OpenAITokenInfo>('/admin/openai/refresh-token', payload)
  return data
}

export async function refreshAccountToken(id: number): Promise<Account> {
  const { data } = await apiClient.post<Account>(`/admin/openai/accounts/${id}/refresh`)
  return data
}

export async function createFromOAuth(payload: OpenAICreateFromOAuthRequest): Promise<Account> {
  const { data } = await apiClient.post<Account>('/admin/openai/create-from-oauth', payload)
  return data
}

export default {
  generateAuthUrl,
  exchangeCode,
  refreshToken,
  refreshAccountToken,
  createFromOAuth
}

