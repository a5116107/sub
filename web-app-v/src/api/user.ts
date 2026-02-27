import { api } from './client';
import type {
  User,
  UserProfile,
  Announcement,
  RedeemHistory,
  Group,
} from '../types';

export const userApi = {
  // Get user profile
  getProfile: () =>
    api.get<UserProfile>('/user/profile'),

  // Update user profile (backend only accepts username)
  updateProfile: (data: { username: string }) =>
    api.put<User>('/user', data),

  // Get available groups
  getGroups: () =>
    api.get<Group[]>('/groups/available'),

  // Get announcements
  getAnnouncements: (params?: { unread_only?: boolean }) =>
    api.get<Announcement[]>('/announcements', { params }),

  // Mark announcement as read
  markAnnouncementRead: (id: number) =>
    api.post<void>(`/announcements/${id}/read`, {}),

  // Redeem code
  redeemCode: (code: string) =>
    api.post<{
      success: boolean;
      type: string;
      value: number;
      message: string;
    }>('/redeem', { code }),

  // Get redeem history
  getRedeemHistory: () =>
    api.get<RedeemHistory[]>('/redeem/history'),

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
