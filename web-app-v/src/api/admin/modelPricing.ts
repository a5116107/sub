import { api } from '../client';
import type {
  ModelPricing,
  PaginatedResponse,
} from '../../types';

export interface ModelPricingQueryParams {
  page?: number;
  page_size?: number;
  platform?: string;
  status?: string;
}

export const adminModelPricingApi = {
  // Get all model pricing
  getPricing: (params?: ModelPricingQueryParams) =>
    api.get<PaginatedResponse<ModelPricing>>('/admin/model-pricing', { params }),

  // Get pricing by ID
  getPricingById: (id: number) =>
    api.get<ModelPricing>(`/admin/model-pricing/${id}`),

  // Get pricing by model name
  getPricingByModel: (model: string) =>
    api.get<ModelPricing>(`/admin/model-pricing/model/${model}`),

  // Create model pricing
  createPricing: (data: Partial<ModelPricing>) =>
    api.post<ModelPricing>('/admin/model-pricing', data),

  // Update model pricing
  updatePricing: (id: number, data: Partial<ModelPricing>) =>
    api.put<ModelPricing>(`/admin/model-pricing/${id}`, data),

  // Delete model pricing
  deletePricing: (id: number) =>
    api.delete<void>(`/admin/model-pricing/${id}`),

  // Sync pricing from upstream
  syncPricing: (platform?: string) =>
    api.post<{
      synced_count: number;
      new_models: string[];
      updated_models: string[];
    }>('/admin/model-pricing/sync', { platform }),

  // Import pricing from JSON
  importPricing: (data: { pricing: Partial<ModelPricing>[] }) =>
    api.post<{
      imported_count: number;
      errors: string[];
    }>('/admin/model-pricing/import', data),

  // Export pricing to JSON
  exportPricing: () =>
    api.get<ModelPricing[]>('/admin/model-pricing/export'),

  // Get pricing stats
  getStats: () =>
    api.get<{
      total_models: number;
      active_models: number;
      platforms: Array<{
        platform: string;
        count: number;
      }>;
    }>('/admin/model-pricing/stats'),
};
