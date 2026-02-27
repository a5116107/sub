// Docs API functions
import { useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
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
export function useDocsNavQuery(params?: MaybeRefOrGetter<DocsListParams | undefined>) {
  const resolvedParams = computed(() => toValue(params))

  return useQuery({
    queryKey: computed(() => DOCS_KEYS.nav(resolvedParams.value)),
    queryFn: () => docsApi.getNav(resolvedParams.value),
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
}

export function useDocsPageQuery(
  key: MaybeRefOrGetter<string>,
  lang?: MaybeRefOrGetter<string | undefined>
) {
  const resolvedKey = computed(() => toValue(key))
  const resolvedLang = computed(() => toValue(lang))

  return useQuery({
    queryKey: computed(() => DOCS_KEYS.page(resolvedKey.value, resolvedLang.value)),
    queryFn: () => docsApi.getPage(resolvedKey.value, resolvedLang.value),
    enabled: computed(() => !!resolvedKey.value),
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
}
