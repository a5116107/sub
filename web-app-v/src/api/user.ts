import { api } from './client';
import type {
  User,
  UserProfile,
  Announcement,
  RedeemHistory,
} from '../types';

export const userApi = {
  // Get user profile
  getProfile: () =>
    api.get<UserProfile>('/user/profile'),

  // Update user profile
  updateProfile: (data: Partial<UserProfile>) =>
    api.put<User>('/user/profile', data),

  // Get user stats
  getStats: () =>
    api.get<{
      total_requests: number;
      total_tokens: number;
      total_cost: number;
      balance: number;
    }>('/user/stats'),

  // Get dashboard data
  getDashboard: () =>
    api.get<{
      user: User;
      stats: {
        today_requests: number;
        today_cost: number;
        month_requests: number;
        month_cost: number;
      };
      recent_usage: unknown[];
      announcements: Announcement[];
    }>('/user/dashboard'),

  // Get available groups
  getGroups: () =>
    api.get<Array<{
      id: number;
      name: string;
      description: string;
      platform: string;
    }>>('/user/groups'),

  // Get announcements
  getAnnouncements: () =>
    api.get<Announcement[]>('/user/announcements'),

  // Mark announcement as read
  markAnnouncementRead: (id: number) =>
    api.post<void>(`/user/announcements/${id}/read`, {}),

  // Redeem code
  redeemCode: (code: string) =>
    api.post<{
      success: boolean;
      type: string;
      value: number;
      message: string;
    }>('/user/redeem', { code }),

  // Get redeem history
  getRedeemHistory: () =>
    api.get<RedeemHistory[]>('/user/redeem/history'),

  // Get invite codes
  getInviteCodes: () =>
    api.get<{
      invite_code: string;
      invite_count: number;
      invite_reward: number;
    }>('/user/invite'),

  // Change password
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.put<void>('/user/password', data),

  // TOTP/2FA
  getTOTPStatus: () =>
    api.get<{ enabled: boolean; method?: string }>('/user/totp/status'),

  setupTOTP: () =>
    api.post<{
      secret: string;
      qr_code: string;
      backup_codes: string[];
    }>('/user/totp/setup', {}),

  enableTOTP: (data: { code: string }) =>
    api.post<void>('/user/totp/enable', data),

  disableTOTP: (data: { code: string }) =>
    api.post<void>('/user/totp/disable', data),
};
