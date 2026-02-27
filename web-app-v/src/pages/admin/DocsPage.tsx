import React, { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  Globe,
  Save,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  adminDocsApi,
  type DocPage,
  type DocPageSummary,
  type CreateDocPageRequest,
  type UpdateDocPageRequest,
  type DocPageQueryParams,
} from '../../api/admin/docs';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  Table,
  Modal,
} from '../../components/ui';

const getStatusBadge = (status: string, t: (key: string) => string) => {
  switch (status) {
    case 'published':
      return <Badge variant="success">{t('docs.status.published')}</Badge>;
    case 'draft':
      return <Badge variant="warning">{t('docs.status.draft')}</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};

const getLanguageBadge = (language: string) => {
  const colors: Record<string, string> = {
    en: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    zh: 'bg-red-500/20 text-red-400 border-red-500/30',
    ja: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  };
  const colorClass = colors[language] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  return (
    <span className={`px-2 py-0.5 rounded text-xs border ${colorClass}`}>
      {language.toUpperCase()}
    </span>
  );
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const DocsPage: React.FC = () => {
  const { t } = useTranslation('admin');
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<DocPageSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedPage, setSelectedPage] = useState<DocPageSummary | null>(null);
  const [selectedPageContent, setSelectedPageContent] = useState<DocPage | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateDocPageRequest>({
    key: '',
    title: '',
    content: '',
    language: 'en',
    status: 'draft',
    order: 0,
  });

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const params: DocPageQueryParams = {
        page,
        page_size: pageSize,
      };
      if (searchQuery) params.search = searchQuery;
      if (languageFilter) params.language = languageFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await adminDocsApi.getPages(params);
      setPages(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch pages:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, languageFilter, statusFilter]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const handleCreatePage = async () => {
    if (!formData.key || !formData.title) return;

    setActionLoading(true);
    try {
      await adminDocsApi.createPage(formData);
      setShowCreateModal(false);
      resetForm();
      fetchPages();
    } catch (error) {
      console.error('Failed to create page:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePage = async () => {
    if (!selectedPage) return;

    setActionLoading(true);
    try {
      const updateData: UpdateDocPageRequest = {
        title: formData.title,
        content: formData.content,
        language: formData.language,
        status: formData.status as 'published' | 'draft',
        order: formData.order,
        parent_key: formData.parent_key,
      };
      await adminDocsApi.updatePage(selectedPage.key, updateData);
      setShowEditModal(false);
      setSelectedPage(null);
      resetForm();
      fetchPages();
    } catch (error) {
      console.error('Failed to update page:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePage = async () => {
    if (!selectedPage) return;

    setActionLoading(true);
    try {
      await adminDocsApi.deletePage(selectedPage.key);
      setShowDeleteModal(false);
      setSelectedPage(null);
      fetchPages();
    } catch (error) {
      console.error('Failed to delete page:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = async (pageSummary: DocPageSummary) => {
    setSelectedPage(pageSummary);
    setActionLoading(true);
    try {
      const fullPage = await adminDocsApi.getPageByKey(pageSummary.key);
      setFormData({
        key: fullPage.key,
        title: fullPage.title,
        content: fullPage.content,
        language: fullPage.language,
        status: fullPage.status,
        order: fullPage.order,
        parent_key: fullPage.parent_key,
      });
      setShowEditModal(true);
    } catch (error) {
      console.error('Failed to fetch page:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const openPreviewModal = async (pageSummary: DocPageSummary) => {
    setSelectedPage(pageSummary);
    setActionLoading(true);
    try {
      const fullPage = await adminDocsApi.getPageByKey(pageSummary.key);
      setSelectedPageContent(fullPage);
      setShowPreviewModal(true);
    } catch (error) {
      console.error('Failed to fetch page:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      key: '',
      title: '',
      content: '',
      language: 'en',
      status: 'draft',
      order: 0,
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  const columns = [
    {
      key: 'key',
      title: t('docs.col.key'),
      render: (item: DocPageSummary) => (
        <span className="text-sm text-cyan-400 font-mono">{item.key}</span>
      ),
    },
    {
      key: 'title',
      title: t('docs.col.title'),
      render: (item: DocPageSummary) => (
        <span className="text-sm text-white">{item.title}</span>
      ),
    },
    {
      key: 'language',
      title: t('docs.col.language'),
      render: (item: DocPageSummary) => getLanguageBadge(item.language),
    },
    {
      key: 'status',
      title: t('docs.col.status'),
      render: (item: DocPageSummary) => getStatusBadge(item.status, t),
    },
    {
      key: 'order',
      title: t('docs.col.order'),
      render: (item: DocPageSummary) => (
        <span className="text-sm text-gray-400">{item.order}</span>
      ),
    },
    {
      key: 'updated_at',
      title: t('docs.col.updated'),
      render: (item: DocPageSummary) => (
        <span className="text-sm text-gray-400">{formatDate(item.updated_at)}</span>
      ),
    },
    {
      key: 'actions',
      title: t('docs.col.actions'),
      render: (item: DocPageSummary) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openPreviewModal(item)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title={t('docs.preview')}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEditModal(item)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-cyan-400 transition-colors"
            title={t('common:btn.edit')}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedPage(item);
              setShowDeleteModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-red-400 transition-colors"
            title={t('common:btn.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const DocForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        {!isEdit && (
          <div className="col-span-2">
            <label className="block text-sm text-gray-400 mb-1">{t('docs.form.key')} *</label>
            <Input
              placeholder="e.g., getting-started"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('docs.form.keyDesc')}
            </p>
          </div>
        )}
        <div className="col-span-2">
          <label className="block text-sm text-gray-400 mb-1">{t('docs.form.title')} *</label>
          <Input
            placeholder="Page title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('docs.form.language')}</label>
          <select
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
          >
            <option value="en">English</option>
            <option value="zh">Chinese</option>
            <option value="ja">Japanese</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('docs.form.status')}</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'published' | 'draft' })}
            className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
          >
            <option value="draft">{t('docs.status.draft')}</option>
            <option value="published">{t('docs.status.published')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('docs.form.order')}</label>
          <Input
            type="number"
            placeholder="0"
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('docs.form.parentKey')}</label>
          <Input
            placeholder="Optional parent page key"
            value={formData.parent_key || ''}
            onChange={(e) => setFormData({ ...formData, parent_key: e.target.value || undefined })}
          />
        </div>
      </div>

      {/* Content Editor */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">{t('docs.form.content')}</label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          className="w-full h-64 bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-[#00F0FF] outline-none resize-none"
          placeholder="# Page Title&#10;&#10;Write your content here using Markdown..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          variant="secondary"
          onClick={() => {
            if (isEdit) {
              setShowEditModal(false);
            } else {
              setShowCreateModal(false);
            }
            resetForm();
            setSelectedPage(null);
          }}
        >
          {t('common:btn.cancel')}
        </Button>
        <Button
          onClick={isEdit ? handleUpdatePage : handleCreatePage}
          isLoading={actionLoading}
          disabled={!formData.title || (!isEdit && !formData.key)}
        >
          <Save className="w-4 h-4 mr-2" />
          {isEdit ? t('common:btn.saveChanges') : t('docs.create')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{t('docs.title')}</h1>
          <p className="text-gray-400">{t('docs.subtitle')}</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('docs.addPage')}
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder={t('userAttributes.search')}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <select
              value={languageFilter}
              onChange={(e) => {
                setLanguageFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="">{t('docs.allLanguages')}</option>
              <option value="en">English</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="">{t('docs.allStatus')}</option>
              <option value="published">{t('docs.status.published')}</option>
              <option value="draft">{t('docs.status.draft')}</option>
            </select>
            <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
              <FileText className="w-4 h-4" />
              <span>{t('docs.pagesCount', { count: total })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={pages}
            loading={loading}
            emptyText={t('docs.empty')}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#2A2A30]">
              <p className="text-sm text-gray-400">
                {t('common:table.showing', { start: (page - 1) * pageSize + 1, end: Math.min(page * pageSize, total), total })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-400">
                  {t('common:table.page', { current: page, total: totalPages })}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title={t('docs.create')}
      >
        <DocForm />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedPage(null);
          resetForm();
        }}
        title={t('docs.edit')}
      >
        <DocForm isEdit />
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setSelectedPage(null);
          setSelectedPageContent(null);
        }}
        title={selectedPageContent?.title || t('docs.preview')}
      >
        {selectedPageContent && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Globe className="w-4 h-4" />
              <span>{selectedPageContent.language.toUpperCase()}</span>
              <span className="mx-2">•</span>
              {getStatusBadge(selectedPageContent.status, t)}
            </div>
            <div className="bg-[#0A0A0C] border border-[#2A2A30] rounded-lg p-4">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                {selectedPageContent.content || t('docs.noContent')}
              </pre>
            </div>
            <div className="flex justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowPreviewModal(false);
                  setSelectedPage(null);
                  setSelectedPageContent(null);
                }}
              >
                {t('common:btn.close')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedPage(null);
        }}
        title={t('docs.delete')}
      >
        {selectedPage && (
          <div className="space-y-4">
            <p className="text-gray-400">
              {t('docs.deleteConfirm')}{' '}
              <span className="text-white font-medium">{selectedPage.title}</span>?
            </p>
            <p className="text-sm text-red-400">
              {t('docs.deleteWarning')}
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedPage(null);
                }}
              >
                {t('common:btn.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDeletePage}
                isLoading={actionLoading}
              >
                {t('docs.delete')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DocsPage;
