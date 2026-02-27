import { api } from './client';
import type {
  APIKey,
  CreateAPIKeyRequest,
  UpdateAPIKeyRequest,
  PaginatedResponse,
} from '../types';

export const keysApi = {
  // Get all API keys (paginated)
  getKeys: (params?: { page?: number; page_size?: number }) =>
    api.get<PaginatedResponse<APIKey>>('/keys', { params }),

  // Get API key by ID
  getKey: (id: number) =>
    api.get<APIKey>(`/keys/${id}`),

  // Create new API key
  createKey: (data: CreateAPIKeyRequest) =>
    api.post<APIKey & { full_key: string }>('/keys', data),

  // Update API key
  updateKey: (id: number, data: UpdateAPIKeyRequest) =>
    api.put<APIKey>(`/keys/${id}`, data),

  // Delete API key
  deleteKey: (id: number) =>
    api.delete<void>(`/keys/${id}`),
};
