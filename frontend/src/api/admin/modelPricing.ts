/**
 * Admin Model Pricing API
 * Manage billing model token pricing (model_pricing.json)
 */

import { apiClient } from '../client'

export interface ModelPricingStatus {
  model_count: number
  last_updated: string
  local_hash: string
  override_enabled: boolean
  remote_url?: string
  hash_url?: string
  data_dir?: string
}

export async function getStatus(): Promise<ModelPricingStatus> {
  const { data } = await apiClient.get<ModelPricingStatus>('/admin/model-pricing/status')
  return data
}

export async function setOverride(enabled: boolean): Promise<ModelPricingStatus> {
  const { data } = await apiClient.put<ModelPricingStatus>('/admin/model-pricing/override', { enabled })
  return data
}

export async function syncFromRemote(disableOverride: boolean = true): Promise<ModelPricingStatus> {
  const { data } = await apiClient.post<ModelPricingStatus>('/admin/model-pricing/sync', { disable_override: disableOverride })
  return data
}

export async function importPricing(file: File, override: boolean = true): Promise<ModelPricingStatus> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiClient.post<ModelPricingStatus>('/admin/model-pricing/import', form, {
    params: { override },
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data
}

export async function importPricingJson(pricingJson: unknown, override: boolean = true): Promise<ModelPricingStatus> {
  const { data } = await apiClient.post<ModelPricingStatus>('/admin/model-pricing/import', pricingJson, {
    params: { override },
    headers: { 'Content-Type': 'application/json' }
  })
  return data
}

export async function downloadPricing(): Promise<Blob> {
  const { data } = await apiClient.get('/admin/model-pricing/download', {
    responseType: 'blob'
  })
  return data as Blob
}

export async function downloadPricingText(): Promise<string> {
  const { data } = await apiClient.get<string>('/admin/model-pricing/download', {
    responseType: 'text'
  })
  return data as unknown as string
}

export default {
  getStatus,
  setOverride,
  syncFromRemote,
  importPricing,
  importPricingJson,
  downloadPricing,
  downloadPricingText
}
