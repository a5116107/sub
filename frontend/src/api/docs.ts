/**
 * Public Docs API endpoints
 * Fetch in-site documentation pages (Markdown)
 */

import { apiClient } from './client'

export interface DocsPage {
  key: string
  lang: 'zh' | 'en' | string
  title?: string
  format?: 'markdown' | 'html' | 'text' | string
  markdown: string
  updated_at?: string
}

export interface DocsNavItem {
  key: string
  title: string
  group?: string
  order?: number
  format?: 'markdown' | 'html' | 'text' | string
}

export async function getDocsPage(key: string, lang: string): Promise<DocsPage> {
  const { data } = await apiClient.get<DocsPage>(`/docs/${encodeURIComponent(key)}`, {
    params: { lang }
  })
  return data
}

export default {
  getDocsPage,
  listDocsPages
}

export async function listDocsPages(lang: string): Promise<DocsNavItem[]> {
  const { data } = await apiClient.get<DocsNavItem[]>('/docs/pages', { params: { lang } })
  return data
}
