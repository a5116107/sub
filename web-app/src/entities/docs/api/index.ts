// Docs API functions
import { useQuery } from '@tanstack/vue-query'
import { get } from '~/shared/api/client'
import type { DocsNavItem, DocsPage, DocsListParams } from '../model/types'

// Query Keys
export const DOCS_KEYS = {
  all: ['docs'] as const,
  nav: (params?: DocsListParams) => [...DOCS_KEYS.all, 'nav', params] as const,
  page: (key: string, lang?: string) => [...DOCS_KEYS.all, 'page', key, lang] as const
}

// API functions
export const docsApi = {
  // Get navigation items
  getNav: (params?: DocsListParams) =>
    get<DocsNavItem[]>('/docs/pages', params),

  // Get single page content
  getPage: (key: string, lang?: string) =>
    get<DocsPage>(`/docs/${key}`, lang ? { lang } : undefined)
}

// Composables
export function useDocsNavQuery(params?: DocsListParams) {
  return useQuery({
    queryKey: DOCS_KEYS.nav(params),
    queryFn: () => docsApi.getNav(params),
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
}

export function useDocsPageQuery(key: string, lang?: string) {
  return useQuery({
    queryKey: DOCS_KEYS.page(key, lang),
    queryFn: () => docsApi.getPage(key, lang),
    enabled: !!key,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
}
