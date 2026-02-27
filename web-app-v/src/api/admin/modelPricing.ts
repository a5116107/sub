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

interface PricingServiceStatus {
  model_count: number;
  last_updated?: string;
  local_hash?: string;
  override_enabled?: boolean;
  remote_url?: string;
  hash_url?: string;
  data_dir?: string;
}

type PricingPayload = Record<string, Record<string, unknown>>;

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return 0;
};

const resolvePlatform = (model: string, entry: Record<string, unknown>) => {
  const provider = String(entry.litellm_provider || '').toLowerCase();
  if (provider) {
    if (provider.includes('anthropic')) return 'claude';
    if (provider.includes('openai')) return 'openai';
    if (provider.includes('gemini') || provider.includes('google')) return 'gemini';
    if (provider.includes('antigravity')) return 'antigravity';
    return provider;
  }
  if (model.toLowerCase().includes('claude')) return 'claude';
  if (model.toLowerCase().includes('gpt') || model.toLowerCase().includes('openai')) return 'openai';
  if (model.toLowerCase().includes('gemini')) return 'gemini';
  return 'unknown';
};

const modelEntryToPricing = (model: string, entry: Record<string, unknown>, id: number): ModelPricing => ({
  id,
  model,
  input_price: toNumber(entry.input_cost_per_token ?? entry.input_cost_per_1k_tokens),
  output_price: toNumber(entry.output_cost_per_token ?? entry.output_cost_per_1k_tokens),
  cache_creation_price: toNumber(entry.cache_creation_input_token_cost),
  cache_read_price: toNumber(entry.cache_read_input_token_cost),
  platform: resolvePlatform(model, entry),
  status: 'active',
  created_at: '',
  updated_at: '',
});

const pricingToModelEntry = (pricing: Partial<ModelPricing>, existing?: Record<string, unknown>) => ({
  ...(existing || {}),
  litellm_provider: pricing.platform || existing?.litellm_provider || 'openai',
  input_cost_per_token: pricing.input_price ?? existing?.input_cost_per_token ?? 0,
  output_cost_per_token: pricing.output_price ?? existing?.output_cost_per_token ?? 0,
  cache_creation_input_token_cost: pricing.cache_creation_price ?? existing?.cache_creation_input_token_cost ?? 0,
  cache_read_input_token_cost: pricing.cache_read_price ?? existing?.cache_read_input_token_cost ?? 0,
});

const toPricingList = (payload: PricingPayload): ModelPricing[] =>
  Object.entries(payload || {})
    .filter(([model, entry]) => model !== 'sample_spec' && entry && typeof entry === 'object')
    .map(([model, entry], index) => modelEntryToPricing(model, entry, index + 1))
    .sort((left, right) => left.model.localeCompare(right.model))
    .map((item, index) => ({ ...item, id: index + 1 }));

const fetchPayload = async (): Promise<PricingPayload> =>
  api.get<PricingPayload>('/admin/model-pricing/download');

const importPayload = async (payload: PricingPayload) =>
  api.post<PricingServiceStatus>('/admin/model-pricing/import', payload);

const getModelById = (items: ModelPricing[], id: number) =>
  items.find((item) => item.id === id);

export const adminModelPricingApi = {
  // Get all model pricing (compat layer over model-pricing/download)
  getPricing: async (params?: ModelPricingQueryParams): Promise<PaginatedResponse<ModelPricing>> => {
    const payload = await fetchPayload();
    let items = toPricingList(payload);
    if (params?.platform) {
      items = items.filter((item) => item.platform === params.platform);
    }
    if (params?.status) {
      items = items.filter((item) => item.status === params.status);
    }

    const page = params?.page || 1;
    const pageSize = params?.page_size || 20;
    const start = (page - 1) * pageSize;
    const pagedItems = items.slice(start, start + pageSize);
    return {
      items: pagedItems,
      total: items.length,
      page,
      page_size: pageSize,
    };
  },

  // Get pricing by ID (compat)
  getPricingById: async (id: number) => {
    const payload = await fetchPayload();
    const items = toPricingList(payload);
    const pricing = getModelById(items, id);
    if (!pricing) {
      throw new Error('Model pricing item not found');
    }
    return pricing;
  },

  // Get pricing by model
  getPricingByModel: async (model: string) => {
    const payload = await fetchPayload();
    const items = toPricingList(payload);
    const pricing = items.find((item) => item.model === model);
    if (!pricing) {
      throw new Error('Model pricing item not found');
    }
    return pricing;
  },

  // Create model pricing (compat via import API)
  createPricing: async (data: Partial<ModelPricing>) => {
    if (!data.model) {
      throw new Error('Model name is required');
    }
    const payload = await fetchPayload();
    payload[data.model] = pricingToModelEntry(data, payload[data.model]);
    await importPayload(payload);
    return adminModelPricingApi.getPricingByModel(data.model);
  },

  // Update model pricing (compat via import API)
  updatePricing: async (id: number, data: Partial<ModelPricing>) => {
    const payload = await fetchPayload();
    const items = toPricingList(payload);
    const target = getModelById(items, id);
    if (!target) {
      throw new Error('Model pricing item not found');
    }
    payload[target.model] = pricingToModelEntry(data, payload[target.model]);
    await importPayload(payload);
    return adminModelPricingApi.getPricingByModel(target.model);
  },

  // Delete model pricing (compat via import API)
  deletePricing: async (id: number) => {
    const payload = await fetchPayload();
    const items = toPricingList(payload);
    const target = getModelById(items, id);
    if (!target) {
      throw new Error('Model pricing item not found');
    }
    delete payload[target.model];
    await importPayload(payload);
  },

  // Sync pricing from upstream
  syncPricing: async (platform?: string) => {
    const payload: Record<string, unknown> = { disable_override: true };
    if (platform) payload.platform = platform;
    const status = await api.post<PricingServiceStatus>('/admin/model-pricing/sync', payload);
    return {
      synced_count: status.model_count || 0,
      new_models: [] as string[],
      updated_models: [] as string[],
    };
  },

  // Import pricing from JSON
  importPricing: async (data: { pricing: Partial<ModelPricing>[] }) => {
    const payload = await fetchPayload();
    const errors: string[] = [];
    let importedCount = 0;
    for (const item of data.pricing || []) {
      if (!item.model) {
        errors.push('Model field is required');
        continue;
      }
      payload[item.model] = pricingToModelEntry(item, payload[item.model]);
      importedCount += 1;
    }
    if (importedCount > 0) {
      await importPayload(payload);
    }
    return {
      imported_count: importedCount,
      errors,
    };
  },

  // Export pricing to JSON
  exportPricing: async () =>
    fetchPayload(),

  // Get pricing stats (compat over downloaded list)
  getStats: async () => {
    const payload = await fetchPayload();
    const items = toPricingList(payload);
    const platformMap = new Map<string, number>();
    items.forEach((item) => {
      platformMap.set(item.platform, (platformMap.get(item.platform) || 0) + 1);
    });
    return {
      total_models: items.length,
      active_models: items.filter((item) => item.status === 'active').length,
      platforms: Array.from(platformMap.entries()).map(([platform, count]) => ({ platform, count })),
    };
  },

  // Get pricing status
  getStatus: async () => {
    const status = await api.get<PricingServiceStatus>('/admin/model-pricing/status');
    return {
      last_sync_at: status.last_updated,
      sync_status: status.override_enabled ? 'override' : 'synced',
      pending_changes: 0,
    };
  },

  // Download pricing
  downloadPricing: async () => {
    const payload = await fetchPayload();
    return JSON.stringify(payload, null, 2);
  },

  // Set price override (compat via import)
  setOverride: async (id: number, data: {
    input_price?: number;
    output_price?: number;
    cache_creation_price?: number;
    cache_read_price?: number;
  }) =>
    adminModelPricingApi.updatePricing(id, {
      input_price: data.input_price,
      output_price: data.output_price,
      cache_creation_price: data.cache_creation_price,
      cache_read_price: data.cache_read_price,
    }),
};
