import { api } from '../client';
import type { PaginatedResponse } from '../../types';

// ==================== Doc Page Types ====================

export interface DocPage {
  id: number;
  key: string;
  title: string;
  content: string;
  language: string;
  status: 'published' | 'draft';
  order: number;
  parent_key?: string;
  created_at: string;
  updated_at: string;
}

export interface DocPageSummary {
  id: number;
  key: string;
  title: string;
  language: string;
  status: 'published' | 'draft';
  order: number;
  parent_key?: string;
  updated_at: string;
}

// ==================== Request Types ====================

export interface CreateDocPageRequest {
  key: string;
  title: string;
  content: string;
  language?: string;
  status?: 'published' | 'draft';
  order?: number;
  parent_key?: string;
}

export interface UpdateDocPageRequest {
  title?: string;
  content?: string;
  language?: string;
  status?: 'published' | 'draft';
  order?: number;
  parent_key?: string;
}

// ==================== Query Params ====================

export interface DocPageQueryParams {
  page?: number;
  page_size?: number;
  language?: string;
  status?: string;
  search?: string;
}

// ==================== API Client ====================

export const adminDocsApi = {
  // Get all doc pages (admin list)
  getPages: (params?: DocPageQueryParams) =>
    api.get<PaginatedResponse<DocPageSummary>>('/admin/docs/pages', { params }),

  // Create doc page
  createPage: (data: CreateDocPageRequest) =>
    api.post<DocPage>('/admin/docs/pages', data),

  // Get doc page by key (admin)
  getPageByKey: (key: string) =>
    api.get<DocPage>(`/admin/docs/${key}`),

  // Update doc page
  updatePage: (key: string, data: UpdateDocPageRequest) =>
    api.put<DocPage>(`/admin/docs/pages/${key}`, data),

  // Delete doc page
  deletePage: (key: string) =>
    api.delete<void>(`/admin/docs/pages/${key}`),

  // Get public doc by key
  getDoc: (key: string) =>
    api.get<DocPage>(`/admin/docs/${key}`),

  // Update public doc content
  updateDoc: (key: string, data: { content: string }) =>
    api.put<DocPage>(`/admin/docs/${key}`, data),
};
