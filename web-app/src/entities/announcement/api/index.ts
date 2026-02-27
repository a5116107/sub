// Announcement API functions
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { get, post } from '~/shared/api/client'
import type { Announcement, AnnouncementListParams } from '../model/types'
import type { PaginatedResponse } from '~/shared/types'

// Query Keys
export const ANNOUNCEMENT_KEYS = {
  all: ['announcements'] as const,
  list: (params?: AnnouncementListParams) => [...ANNOUNCEMENT_KEYS.all, 'list', params] as const,
  detail: (id: number) => [...ANNOUNCEMENT_KEYS.all, 'detail', id] as const,
  unreadCount: () => [...ANNOUNCEMENT_KEYS.all, 'unreadCount'] as const
}

// API functions
export const announcementApi = {
  // Get announcement list
  list: (params?: AnnouncementListParams) =>
    get<PaginatedResponse<Announcement>>('/announcements', params),

  // Get single announcement (fallback from list, backend has no GET /announcements/:id)
  get: async (id: number) => {
    const response = await get<PaginatedResponse<Announcement>>('/announcements', {
      page: 1,
      page_size: 100
    })
    const announcement = response.items?.find(item => item.id === id)
    if (!announcement) {
      throw new Error('Announcement not found')
    }
    return announcement
  },

  // Mark announcement as read
  markAsRead: (id: number) =>
    post<void>(`/announcements/${id}/read`),

  // Mark all announcements as read via existing backend capability
  markAllAsRead: async () => {
    let page = 1
    const pageSize = 100

    for (;;) {
      const unreadPage = await get<PaginatedResponse<Announcement>>('/announcements', {
        page,
        page_size: pageSize,
        unread_only: true
      })

      const unreadItems = unreadPage.items || []
      if (unreadItems.length === 0) {
        break
      }

      await Promise.all(unreadItems.map(item => post<void>(`/announcements/${item.id}/read`)))

      if (unreadItems.length < pageSize) {
        break
      }
      page += 1
    }
  },

  // Get unread count via list total
  getUnreadCount: async () => {
    const response = await get<PaginatedResponse<Announcement>>('/announcements', {
      page: 1,
      page_size: 1,
      unread_only: true
    })
    return { count: response.total || 0 }
  }
}

// Composables
export function useAnnouncementsQuery(params?: AnnouncementListParams) {
  return useQuery({
    queryKey: ANNOUNCEMENT_KEYS.list(params),
    queryFn: () => announcementApi.list(params)
  })
}

export function useAnnouncementQuery(id: number) {
  return useQuery({
    queryKey: ANNOUNCEMENT_KEYS.detail(id),
    queryFn: () => announcementApi.get(id),
    enabled: id > 0
  })
}

export function useUnreadCountQuery() {
  return useQuery({
    queryKey: ANNOUNCEMENT_KEYS.unreadCount(),
    queryFn: () => announcementApi.getUnreadCount(),
    refetchInterval: 60000 // Refresh every minute
  })
}

export function useMarkAsReadMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: announcementApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENT_KEYS.all })
    }
  })
}

export function useMarkAllAsReadMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: announcementApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENT_KEYS.all })
    }
  })
}
