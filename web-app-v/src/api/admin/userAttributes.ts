import { api } from '../client';

export interface UserAttribute {
  id: number;
  key: string;
  name: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json';
  required: boolean;
  default_value?: string;
  validation_regex?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateUserAttributeRequest {
  key: string;
  name: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json';
  required?: boolean;
  default_value?: string;
  validation_regex?: string;
  display_order?: number;
}

export interface UpdateUserAttributeRequest {
  name?: string;
  description?: string;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'json';
  required?: boolean;
  default_value?: string;
  validation_regex?: string;
  display_order?: number;
}

export interface UserAttributeBatchResponse {
  attributes: Record<number, Record<string, unknown>>;
}

export interface ReorderUserAttributesRequest {
  ids: number[];
}

export const userAttributesApi = {
  // Get all user attributes
  getList: () =>
    api.get<UserAttribute[]>('/admin/user-attributes'),

  // Create a new user attribute
  create: (data: CreateUserAttributeRequest) =>
    api.post<UserAttribute>('/admin/user-attributes', data),

  // Update a user attribute
  update: (id: number, data: UpdateUserAttributeRequest) =>
    api.put<UserAttribute>(`/admin/user-attributes/${id}`, data),

  // Delete a user attribute
  delete: (id: number) =>
    api.delete<void>(`/admin/user-attributes/${id}`),

  // Reorder user attributes
  reorder: (ids: number[]) =>
    api.put<void>('/admin/user-attributes/reorder', { ids }),

  // Batch get user attributes for users
  batchGet: (userIds: number[]) =>
    api.post<UserAttributeBatchResponse>('/admin/user-attributes/batch', { user_ids: userIds }),
};
