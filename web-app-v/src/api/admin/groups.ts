import { api } from '../client';
import type {
  Group,
  PaginatedResponse,
} from '../../types';

export interface GroupQueryParams {
  page?: number;
  page_size?: number;
  platform?: string;
  status?: string;
}

export const adminGroupsApi = {
  // Get all groups
  getGroups: (params?: GroupQueryParams) =>
    api.get<PaginatedResponse<Group>>('/admin/groups', { params }),

  // Get group by ID
  getGroup: (id: number) =>
    api.get<Group>(`/admin/groups/${id}`),

  // Create group
  createGroup: (data: Partial<Group>) =>
    api.post<Group>('/admin/groups', data),

  // Update group
  updateGroup: (id: number, data: Partial<Group>) =>
    api.put<Group>(`/admin/groups/${id}`, data),

  // Delete group
  deleteGroup: (id: number) =>
    api.delete<void>(`/admin/groups/${id}`),

  // Get group stats
  getGroupStats: (id: number) =>
    api.get<{
      total_accounts: number;
      active_accounts: number;
      total_requests_today: number;
      total_cost_today: number;
      active_subscriptions: number;
    }>(`/admin/groups/${id}/stats`),

  // Get group accounts
  getGroupAccounts: (id: number) =>
    api.get<Array<{
      id: number;
      name: string;
      platform: string;
      status: string;
    }>>(`/admin/groups/${id}/accounts`),

  // Get group subscriptions
  getGroupSubscriptions: (id: number) =>
    api.get<Array<{
      id: number;
      user_id: number;
      user_email: string;
      status: string;
      expires_at: string;
    }>>(`/admin/groups/${id}/subscriptions`),

  // Set group models
  setGroupModels: (id: number, models: string[]) =>
    api.put<void>(`/admin/groups/${id}/models`, { models }),

  // Get group models
  getGroupModels: (id: number) =>
    api.get<string[]>(`/admin/groups/${id}/models`),
};
