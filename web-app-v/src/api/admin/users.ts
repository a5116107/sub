import { api } from '../client';
import type {
  User,
  AdminUser,
  PaginatedResponse,
} from '../../types';

export interface UserQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  role?: string;
  status?: string;
}

export const adminUsersApi = {
  // Get all users
  getUsers: (params?: UserQueryParams) =>
    api.get<PaginatedResponse<AdminUser>>('/admin/users', { params }),

  // Get user by ID
  getUser: (id: number) =>
    api.get<AdminUser>(`/admin/users/${id}`),

  // Create user
  createUser: (data: Partial<User>) =>
    api.post<AdminUser>('/admin/users', data),

  // Update user
  updateUser: (id: number, data: Partial<User>) =>
    api.put<AdminUser>(`/admin/users/${id}`, data),

  // Delete user
  deleteUser: (id: number) =>
    api.delete<void>(`/admin/users/${id}`),

  // Adjust user balance
  adjustBalance: (id: number, data: {
    amount: number;
    reason: string;
  }) =>
    api.post<{ new_balance: number }>(`/admin/users/${id}/balance`, data),

  // Set user groups
  setUserGroups: (id: number, groupIds: number[]) =>
    api.put<AdminUser>(`/admin/users/${id}`, { allowed_groups: groupIds }),

  // Set user role
  setUserRole: (id: number, role: string) =>
    api.put<AdminUser>(`/admin/users/${id}`, { role } as unknown as Partial<User>),

  // Set user status
  setUserStatus: (id: number, status: string) =>
    api.put<AdminUser>(`/admin/users/${id}`, { status }),

  // Get user usage stats
  getUserUsage: (id: number, params?: { start_date?: string; end_date?: string }) =>
    api.get<{
      total_requests: number;
      total_tokens: number;
      total_cost: number;
      daily_stats: Array<{
        date: string;
        requests: number;
        tokens: number;
        cost: number;
      }>;
    }>(`/admin/users/${id}/usage`, { params }),

  // Get user API keys
  getUserApiKeys: (id: number) =>
    api.get<Array<{
      id: number;
      name: string;
      key: string;
      status: string;
      group_id?: number;
      group_name?: string;
      created_at: string;
    }>>(`/admin/users/${id}/api-keys`),

  // Get user subscriptions
  getUserSubscriptions: (id: number) =>
    api.get<Array<{
      id: number;
      group_name: string;
      status: string;
      expires_at: string;
    }>>(`/admin/users/${id}/subscriptions`),

  // Get user attributes
  getUserAttributes: (id: number) =>
    api.get<Array<{
      id: number;
      attribute_id: number;
      attribute_name: string;
      attribute_key: string;
      value: string;
      created_at: string;
      updated_at: string;
    }>>(`/admin/users/${id}/attributes`),

  // Update user attributes
  updateUserAttributes: (id: number, data: { attributes: Array<{ attribute_id: number; value: string }> }) =>
    api.put<void>(`/admin/users/${id}/attributes`, data),
};
