import { api } from './client';
import type { Announcement } from '../types';

export const announcementsApi = {
  // Get user announcements
  getAnnouncements: (params?: { unread_only?: boolean }) =>
    api.get<Announcement[]>('/announcements', { params }),

  // Mark announcement as read
  markAsRead: (id: number) =>
    api.post<void>(`/announcements/${id}/read`, {}),
};
