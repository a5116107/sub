// Docs entity types

export interface DocsNavItem {
  key: string
  title: string
  order: number
}

export interface DocsPage {
  key: string
  lang: string
  title: string
  format: 'markdown' | 'html' | 'text'
  markdown: string
  updated_at: string
}

export interface DocsListParams {
  lang?: string
}
