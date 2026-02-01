/**
 * Admin Docs API endpoints
 * Manage in-site documentation pages (Markdown)
 */

import { apiClient } from '../client'

export interface DocsPage {
  key: string
  lang: 'zh' | 'en' | string
  title?: string
  format?: 'markdown' | 'html' | 'text' | string
  markdown: string
  updated_at?: string
}

export interface DocsPageMeta {
  key: string
  title_zh?: string
  title_en?: string
  group?: string
  order?: number
  format?: 'markdown' | 'html' | 'text' | string
  public: boolean
}

export interface UpdateDocsPageRequest {
  lang: 'zh' | 'en' | string
  markdown: string
}

export interface UpsertDocsPageMetaRequest {
  key: string
  title_zh?: string
  title_en?: string
  group?: string
  order?: number
  format?: 'markdown' | 'html' | 'text' | string
  public: boolean
}

export async function getDocPage(key: string, lang: string): Promise<DocsPage> {
  const { data } = await apiClient.get<DocsPage>(`/admin/docs/${encodeURIComponent(key)}`, {
    params: { lang }
  })
  return data
}

export async function updateDocPage(key: string, req: UpdateDocsPageRequest): Promise<DocsPage> {
  const { data } = await apiClient.put<DocsPage>(`/admin/docs/${encodeURIComponent(key)}`, req)
  return data
}

export async function listPages(): Promise<DocsPageMeta[]> {
  const { data } = await apiClient.get<DocsPageMeta[]>('/admin/docs/pages')
  return data
}

export async function createPage(req: UpsertDocsPageMetaRequest): Promise<DocsPageMeta> {
  const { data } = await apiClient.post<DocsPageMeta>('/admin/docs/pages', req)
  return data
}

export async function updatePageMeta(key: string, req: UpsertDocsPageMetaRequest): Promise<DocsPageMeta> {
  const { data } = await apiClient.put<DocsPageMeta>(`/admin/docs/pages/${encodeURIComponent(key)}`, req)
  return data
}

export async function deletePage(key: string): Promise<{ deleted: boolean }> {
  const { data } = await apiClient.delete<{ deleted: boolean }>(`/admin/docs/pages/${encodeURIComponent(key)}`)
  return data
}

export default {
  getDocPage,
  updateDocPage,
  listPages,
  createPage,
  updatePageMeta,
  deletePage
}
