import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Search, ChevronRight, Loader2 } from 'lucide-react';
import { docsApi, type DocPage, type DocContent } from '../../api/docs';
import {
  Card,
  CardContent,
  Input,
  Skeleton,
} from '../../components/ui';

// Simple safe text renderer - renders content as pre-formatted text
// to avoid XSS from dangerouslySetInnerHTML
const SafeDocContent: React.FC<{ content: string }> = ({ content }) => {
  // Split content into paragraphs and render safely
  const paragraphs = content.split(/\n\n+/);

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, idx) => {
        const trimmed = paragraph.trim();
        if (!trimmed) return null;

        // Detect headings (lines starting with #)
        if (trimmed.startsWith('# ')) {
          return <h2 key={idx} className="text-xl font-bold text-white mt-6 mb-2">{trimmed.slice(2)}</h2>;
        }
        if (trimmed.startsWith('## ')) {
          return <h3 key={idx} className="text-lg font-semibold text-white mt-4 mb-2">{trimmed.slice(3)}</h3>;
        }
        if (trimmed.startsWith('### ')) {
          return <h4 key={idx} className="text-base font-semibold text-white mt-3 mb-1">{trimmed.slice(4)}</h4>;
        }

        // Detect code blocks (``` ... ```)
        if (trimmed.startsWith('```')) {
          const codeContent = trimmed.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
          return (
            <pre key={idx} className="p-4 rounded-lg bg-[#0A0A0C] border border-[#2A2A30] text-sm text-gray-300 overflow-x-auto font-mono whitespace-pre-wrap">
              {codeContent}
            </pre>
          );
        }

        // Detect list items
        if (trimmed.split('\n').every(line => /^[-*]\s/.test(line.trim()) || line.trim() === '')) {
          const items = trimmed.split('\n').filter(line => /^[-*]\s/.test(line.trim()));
          return (
            <ul key={idx} className="list-disc list-inside space-y-1 text-gray-300">
              {items.map((item, i) => (
                <li key={i} className="text-sm leading-relaxed">{item.replace(/^[-*]\s/, '')}</li>
              ))}
            </ul>
          );
        }

        // Regular paragraph
        return (
          <p key={idx} className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
};

export const DocsPage: React.FC = () => {
  const { t } = useTranslation('docs');
  const [pages, setPages] = useState<DocPage[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [docLoading, setDocLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const data = await docsApi.getPages();
        const sorted = Array.isArray(data) ? data.sort((a, b) => a.sort_order - b.sort_order) : [];
        setPages(sorted);
        // Auto-select first page
        if (sorted.length > 0) {
          loadDoc(sorted[0].key);
        }
      } catch (error) {
        console.error('Failed to fetch doc pages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
  }, []);

  const loadDoc = async (key: string) => {
    setActiveKey(key);
    setDocLoading(true);
    try {
      const doc = await docsApi.getDoc(key);
      setSelectedDoc(doc);
    } catch (error) {
      console.error('Failed to fetch doc:', error);
      setSelectedDoc(null);
    } finally {
      setDocLoading(false);
    }
  };

  const filteredPages = pages.filter((page) =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">{t('title')}</h1>
        <p className="text-gray-400">{t('subtitle')}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar - Doc List */}
        <div className="lg:w-72 flex-shrink-0">
          <Card>
            <CardContent className="p-4">
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
              <div className="mt-4 space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto">
                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} height={40} />
                    ))}
                  </div>
                ) : filteredPages.length > 0 ? (
                  filteredPages.map((page) => (
                    <button
                      key={page.key}
                      onClick={() => loadDoc(page.key)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all
                        ${activeKey === page.key
                          ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/20'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'}
                      `}
                    >
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{page.title}</span>
                      <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0 opacity-50" />
                    </button>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    {pages.length === 0 ? t('noDocs') : t('noResults')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardContent className="p-6 lg:p-8">
              {docLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 text-[#00F0FF] animate-spin" />
                </div>
              ) : selectedDoc ? (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedDoc.title}</h2>
                  {selectedDoc.updated_at && (
                    <p className="text-xs text-gray-500 mb-6">
                      {t('lastUpdated', { date: new Date(selectedDoc.updated_at).toLocaleDateString() })}
                    </p>
                  )}
                  <SafeDocContent content={selectedDoc.content} />
                </div>
              ) : (
                <div className="text-center py-16">
                  <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">
                    {pages.length === 0
                      ? t('noDocsAvailable')
                      : t('selectDoc')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DocsPage;
