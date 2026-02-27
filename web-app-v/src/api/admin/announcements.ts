import { api } from '../client';
import type {
  Announcement,
  PaginatedResponse,
} from '../../types';

export interface AnnouncementQueryParams {
  page?: number;
  page_size?: number;
  status?: string;
  type?: string;
}

export const adminAnnouncementsApi = {
  // Get all announcements
  getAnnouncements: (params?: AnnouncementQueryParams) =>
    api.get<PaginatedResponse<Announcement>>('/admin/announcements', { params }),

  // Get announcement by ID
  getAnnouncement: (id: number) =>
    api.get<Announcement>(`/admin/announcements/${id}`),

  // Create announcement
  createAnnouncement: (data: Partial<Announcement>) =>
    api.post<Announcement>('/admin/announcements', data),

  // Update announcement
  updateAnnouncement: (id: number, data: Partial<Announcement>) =>
    api.put<Announcement>(`/admin/announcements/${id}`, data),

  // Delete announcement
  deleteAnnouncement: (id: number) =>
    api.delete<void>(`/admin/announcements/${id}`),

  // Get read status for an announcement
  getReadStatus: (id: number, params?: { page?: number; page_size?: number }) =>
    api.get<PaginatedResponse<{
      user_id: number;
      user_email: string;
      read_at: string;
    }>>(`/admin/announcements/${id}/read-status`, { params }),

  // Get announcement stats
  getStats: async () => {
    const response = await api.get<PaginatedResponse<Announcement>>('/admin/announcements', {
      params: { page: 1, page_size: 200 },
    });
    const items = response?.items || [];
    return {
      total_announcements: response?.total ?? items.length,
      active_announcements: items.filter((announcement) => (announcement.status || '').toLowerCase() === 'active').length,
      total_reads: 0,
    };
  },
};
