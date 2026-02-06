import { api } from './client';
import type {
  APIKey,
  CreateAPIKeyRequest,
  UpdateAPIKeyRequest,
} from '../types';

export const keysApi = {
  // Get all API keys
  getKeys: () =>
    api.get<APIKey[]>('/user/keys'),

  // Get API key by ID
  getKey: (id: number) =>
    api.get<APIKey>(`/user/keys/${id}`),

  // Create new API key
  createKey: (data: CreateAPIKeyRequest) =>
    api.post<APIKey & { full_key: string }>('/user/keys', data),

  // Update API key
  updateKey: (id: number, data: UpdateAPIKeyRequest) =>
    api.put<APIKey>(`/user/keys/${id}`, data),

  // Delete API key
  deleteKey: (id: number) =>
    api.delete<void>(`/user/keys/${id}`),

  // Regenerate API key
  regenerateKey: (id: number) =>
    api.post<APIKey & { full_key: string }>(`/user/keys/${id}/regenerate`, {}),
};
