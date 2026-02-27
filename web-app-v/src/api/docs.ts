import { api } from './client';

export interface DocPage {
  key: string;
  title: string;
  sort_order: number;
  group?: string;
  format?: string;
  lang: string;
}

export interface DocContent {
  key: string;
  title: string;
  content: string;
  format?: string;
  lang: string;
  updated_at: string;
}

interface BackendDocPage {
  key: string;
  title?: string;
  group?: string;
  order?: number;
  format?: string;
}

interface BackendDocContent {
  key: string;
  title?: string;
  markdown?: string;
  content?: string;
  format?: string;
  lang?: string;
  updated_at?: string;
}

export const docsApi = {
  getPages: async (params?: { lang?: string }) => {
    const pages = await api.get<BackendDocPage[]>('/docs/pages', { params });
    return (Array.isArray(pages) ? pages : []).map((page) => ({
      key: page.key,
      title: page.title || page.key,
      sort_order: typeof page.order === 'number' ? page.order : 0,
      group: page.group,
      format: page.format,
      lang: params?.lang || 'zh',
    }));
  },

  getDoc: async (key: string, params?: { lang?: string }) => {
    const page = await api.get<BackendDocContent>(`/docs/${key}`, { params });
    return {
      key: page.key,
      title: page.title || key,
      content: page.content || page.markdown || '',
      format: page.format,
      lang: page.lang || params?.lang || 'zh',
      updated_at: page.updated_at || '',
    };
  },
};
