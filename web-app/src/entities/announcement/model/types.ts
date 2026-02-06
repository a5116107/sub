// Announcement entity types

export interface Announcement {
  id: number
  title: string
  content: string
  type: 'info' | 'warning' | 'success' | 'error'
  is_read: boolean
  created_at: string
}

export interface AnnouncementListParams {
  page?: number
  page_size?: number
  unread_only?: boolean
}
