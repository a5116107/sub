import React, { useEffect, useState, useCallback } from 'react';
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Upload,
  BarChart3,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { adminModelPricingApi, type ModelPricingQueryParams } from '../../api/admin/modelPricing';
import type { ModelPricing } from '../../types';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  Table,
  Modal,
  Skeleton,
} from '../../components/ui';

const getStatusBadge = (status: string, t: (key: string) => string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return <Badge variant="success">{t('common:status.active')}</Badge>;
    case 'disabled':
      return <Badge variant="danger">{t('common:status.disabled')}</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};

const getPlatformBadge = (platform: string) => {
  const colors: Record<string, string> = {
    claude: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    openai: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    gemini: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };
  const colorClass = colors[platform.toLowerCase()] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  return (
    <span className={`px-2 py-0.5 rounded text-xs border ${colorClass}`}>
      {platform}
    </span>
  );
};

const formatPrice = (price: number) => {
  return `$${price.toFixed(6)}`;
};

interface PricingStats {
  total_models: number;
  active_models: number;
  platforms: Array<{
    platform: string;
    count: number;
  }>;
}

interface SyncResult {
  synced_count: number;
  new_models: string[];
  updated_models: string[];
}

export const ModelPricingPage: React.FC = () => {
  const { t } = useTranslation('admin');
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<ModelPricing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modal states
  const [selectedPricing, setSelectedPricing] = useState<ModelPricing | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState<PricingStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncPlatform, setSyncPlatform] = useState<string>('');
  const [importData, setImportData] = useState<string>('');
  const [importLoading, setImportLoading] = useState(false);

  // Sync status state
  const [syncStatus, setSyncStatus] = useState<{ last_sync_at?: string; sync_status: string; pending_changes: number } | null>(null);
  const [syncStatusLoading, setSyncStatusLoading] = useState(true);

  // Override state
  const [overrideLoading, setOverrideLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<ModelPricing>>({
    model: '',
    platform: 'claude',
    input_price: 0,
    output_price: 0,
    cache_creation_price: undefined,
    cache_read_price: undefined,
    status: 'active',
  });

  const fetchPricing = useCallback(async () => {
    setLoading(true);
    try {
      const params: ModelPricingQueryParams = {
        page,
        page_size: pageSize,
      };
      if (platformFilter) params.platform = platformFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await adminModelPricingApi.getPricing(params);
      setPricing(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, platformFilter, statusFilter]);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  // Fetch sync status on mount
  useEffect(() => {
    const fetchSyncStatus = async () => {
      setSyncStatusLoading(true);
      try {
        const status = await adminModelPricingApi.getStatus();
        setSyncStatus(status);
      } catch (error) {
        console.error('Failed to fetch sync status:', error);
      } finally {
        setSyncStatusLoading(false);
      }
    };
    fetchSyncStatus();
  }, []);

  const handleCreatePricing = async () => {
    if (!formData.model || !formData.platform) return;

    setActionLoading(true);
    try {
      await adminModelPricingApi.createPricing(formData);
      setShowCreateModal(false);
      resetForm();
      fetchPricing();
    } catch (error) {
      console.error('Failed to create pricing:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePricing = async () => {
    if (!selectedPricing) return;

    setActionLoading(true);
    try {
      await adminModelPricingApi.updatePricing(selectedPricing.id, formData);
      setShowEditModal(false);
      setSelectedPricing(null);
      resetForm();
      fetchPricing();
    } catch (error) {
      console.error('Failed to update pricing:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePricing = async () => {
    if (!selectedPricing) return;

    setActionLoading(true);
    try {
      await adminModelPricingApi.deletePricing(selectedPricing.id);
      setShowDeleteModal(false);
      setSelectedPricing(null);
      fetchPricing();
    } catch (error) {
      console.error('Failed to delete pricing:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const result = await adminModelPricingApi.syncPricing(syncPlatform || undefined);
      setSyncResult(result);
      fetchPricing();
    } catch (error) {
      console.error('Failed to sync pricing:', error);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await adminModelPricingApi.exportPricing();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `model-pricing-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export pricing:', error);
    }
  };

  const handleImport = async () => {
    if (!importData) return;

    setImportLoading(true);
    try {
      const parsed = JSON.parse(importData);
      const pricingArray = Array.isArray(parsed) ? parsed : [parsed];
      await adminModelPricingApi.importPricing({ pricing: pricingArray });
      setShowImportModal(false);
      setImportData('');
      fetchPricing();
    } catch (error) {
      console.error('Failed to import pricing:', error);
    } finally {
      setImportLoading(false);
    }
  };

  const handleDownloadPricing = async () => {
    try {
      const data = await adminModelPricingApi.downloadPricing();
      const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `model-pricing-download-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download pricing:', error);
    }
  };

  const handleOverride = async () => {
    if (!selectedPricing) return;
    setOverrideLoading(true);
    try {
      await adminModelPricingApi.setOverride(selectedPricing.id, {
        input_price: formData.input_price,
        output_price: formData.output_price,
        cache_creation_price: formData.cache_creation_price,
        cache_read_price: formData.cache_read_price,
      });
      setShowEditModal(false);
      setSelectedPricing(null);
      resetForm();
      fetchPricing();
    } catch (error) {
      console.error('Failed to set override:', error);
    } finally {
      setOverrideLoading(false);
    }
  };

  const handleViewStats = async () => {
    setShowStatsModal(true);
    setStatsLoading(true);
    try {
      const statsData = await adminModelPricingApi.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const openEditModal = (item: ModelPricing) => {
    setSelectedPricing(item);
    setFormData({
      model: item.model,
      platform: item.platform,
      input_price: item.input_price,
      output_price: item.output_price,
      cache_creation_price: item.cache_creation_price,
      cache_read_price: item.cache_read_price,
      status: item.status,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      model: '',
      platform: 'claude',
      input_price: 0,
      output_price: 0,
      cache_creation_price: undefined,
      cache_read_price: undefined,
      status: 'active',
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  const columns = [
    {
      key: 'id',
      title: t('modelPricing.col.id'),
      render: (item: ModelPricing) => (
        <span className="text-sm text-gray-400">#{item.id}</span>
      ),
    },
    {
      key: 'model',
      title: t('modelPricing.col.model'),
      render: (item: ModelPricing) => (
        <code className="text-sm font-mono text-cyan-400">{item.model}</code>
      ),
    },
    {
      key: 'platform',
      title: t('modelPricing.col.platform'),
      render: (item: ModelPricing) => getPlatformBadge(item.platform),
    },
    {
      key: 'input',
      title: t('modelPricing.col.inputPrice'),
      render: (item: ModelPricing) => (
        <span className="text-sm text-gray-400">{formatPrice(item.input_price)}{t('common.per1K')}</span>
      ),
    },
    {
      key: 'output',
      title: t('modelPricing.col.outputPrice'),
      render: (item: ModelPricing) => (
        <span className="text-sm text-gray-400">{formatPrice(item.output_price)}{t('common.per1K')}</span>
      ),
    },
    {
      key: 'cache',
      title: t('modelPricing.col.cachePrices'),
      render: (item: ModelPricing) => (
        <div className="text-xs text-gray-500">
          {item.cache_creation_price !== undefined ? (
            <>
              <p>Create: {formatPrice(item.cache_creation_price)}</p>
              <p>Read: {formatPrice(item.cache_read_price || 0)}</p>
            </>
          ) : (
            <span>-</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      title: t('modelPricing.col.status'),
      render: (item: ModelPricing) => getStatusBadge(item.status, t),
    },
    {
      key: 'actions',
      title: t('modelPricing.col.actions'),
      render: (item: ModelPricing) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(item)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title={t('common:btn.edit')}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedPricing(item);
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

  const PricingForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm text-gray-400 mb-1">{t('modelPricing.form.modelName')} *</label>
          <Input
            placeholder="claude-3-opus-20240229"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            disabled={isEdit}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('modelPricing.form.platform')} *</label>
          <select
            value={formData.platform}
            onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
            className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            disabled={isEdit}
          >
            <option value="claude">Claude</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('modelPricing.form.status')}</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
          >
            <option value="active">{t('common:status.active')}</option>
            <option value="disabled">{t('common:status.disabled')}</option>
          </select>
        </div>
      </div>

      <div className="border-t border-[#2A2A30] pt-4">
        <p className="text-sm text-gray-400 mb-3">{t('modelPricing.form.pricingPer1K')}</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('modelPricing.form.inputPrice')} *</label>
            <Input
              type="number"
              step="0.000001"
              min="0"
              placeholder="0.000015"
              value={formData.input_price}
              onChange={(e) => setFormData({ ...formData, input_price: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('modelPricing.form.outputPrice')} *</label>
            <Input
              type="number"
              step="0.000001"
              min="0"
              placeholder="0.000075"
              value={formData.output_price}
              onChange={(e) => setFormData({ ...formData, output_price: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('modelPricing.form.cacheCreationPrice')}</label>
            <Input
              type="number"
              step="0.000001"
              min="0"
              placeholder={t('common:btn.filter')}
              value={formData.cache_creation_price || ''}
              onChange={(e) => setFormData({ ...formData, cache_creation_price: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('modelPricing.form.cacheReadPrice')}</label>
            <Input
              type="number"
              step="0.000001"
              min="0"
              placeholder={t('common:btn.filter')}
              value={formData.cache_read_price || ''}
              onChange={(e) => setFormData({ ...formData, cache_read_price: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </div>
        </div>
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
            setSelectedPricing(null);
          }}
        >
          {t('common:btn.cancel')}
        </Button>
        {isEdit && (
          <Button
            variant="secondary"
            onClick={handleOverride}
            isLoading={overrideLoading}
          >
            {t('modelPricing.override')}
          </Button>
        )}
        <Button
          onClick={isEdit ? handleUpdatePricing : handleCreatePricing}
          isLoading={actionLoading}
          disabled={!formData.model || !formData.platform}
        >
          {isEdit ? t('modelPricing.update') : t('modelPricing.create')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{t('modelPricing.title')}</h1>
          <p className="text-gray-400">{t('modelPricing.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleViewStats}>
            <BarChart3 className="w-4 h-4 mr-2" />
            {t('modelPricing.stats')}
          </Button>
          <Button variant="secondary" onClick={() => setShowSyncModal(true)}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('modelPricing.sync')}
          </Button>
          <Button variant="secondary" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            {t('modelPricing.export')}
          </Button>
          <Button variant="secondary" onClick={handleDownloadPricing}>
            <Download className="w-4 h-4 mr-2" />
            {t('modelPricing.download')}
          </Button>
          <Button variant="secondary" onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            {t('modelPricing.import')}
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('modelPricing.addPricing')}
          </Button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {!syncStatusLoading && syncStatus && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">{t('modelPricing.syncStatusLabel')}</p>
                <Badge variant={syncStatus.sync_status === 'synced' ? 'success' : syncStatus.sync_status === 'pending' ? 'info' : 'default'}>
                  {syncStatus.sync_status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">{t('modelPricing.lastSyncAt')}</p>
                <p className="text-sm text-white">{syncStatus.last_sync_at ? new Date(syncStatus.last_sync_at).toLocaleString() : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">{t('modelPricing.pendingChanges')}</p>
                <p className="text-sm text-white">{syncStatus.pending_changes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <select
              value={platformFilter}
              onChange={(e) => {
                setPlatformFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="">{t('common:btn.filter')}</option>
              <option value="claude">Claude</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="">{t('common:btn.filter')}</option>
              <option value="active">{t('common:status.active')}</option>
              <option value="disabled">{t('common:status.disabled')}</option>
            </select>
            <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
              <DollarSign className="w-4 h-4" />
              <span>{t('modelPricing.modelsCount', { count: total })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={pricing}
            loading={loading}
            emptyText={t('modelPricing.empty')}
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
        title={t('modelPricing.addModel')}
      >
        <PricingForm />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedPricing(null);
          resetForm();
        }}
        title={t('modelPricing.edit')}
      >
        <PricingForm isEdit />
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedPricing(null);
        }}
        title={t('modelPricing.delete')}
      >
        {selectedPricing && (
          <div className="space-y-4">
            <p className="text-gray-400">
              {t('modelPricing.deleteConfirm')}{' '}
              <code className="text-cyan-400 bg-[#0A0A0C] px-2 py-1 rounded">
                {selectedPricing.model}
              </code>
              ?
            </p>
            <p className="text-sm text-red-400">
              {t('common:modal.confirmMessage')}
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedPricing(null);
                }}
              >
                {t('common:btn.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDeletePricing}
                isLoading={actionLoading}
              >
                {t('modelPricing.delete')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Sync Modal */}
      <Modal
        isOpen={showSyncModal}
        onClose={() => {
          setShowSyncModal(false);
          setSyncResult(null);
          setSyncPlatform('');
        }}
        title={t('modelPricing.syncTitle')}
      >
        <div className="space-y-4">
          <p className="text-gray-400">
            {t('modelPricing.syncDesc')}
          </p>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('modelPricing.form.platform')} ({t('common:btn.filter')})</label>
            <select
              value={syncPlatform}
              onChange={(e) => setSyncPlatform(e.target.value)}
              className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="">{t('common:btn.filter')}</option>
              <option value="claude">Claude</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>

          {syncResult && (
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-sm text-emerald-400 mb-2">
                Synced {syncResult.synced_count} models
              </p>
              {syncResult.new_models.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-gray-500">New models:</p>
                  <p className="text-xs text-cyan-400">{syncResult.new_models.join(', ')}</p>
                </div>
              )}
              {syncResult.updated_models.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500">Updated models:</p>
                  <p className="text-xs text-amber-400">{syncResult.updated_models.join(', ')}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowSyncModal(false);
                setSyncResult(null);
                setSyncPlatform('');
              }}
            >
              {t('common:btn.close')}
            </Button>
            <Button onClick={handleSync} isLoading={syncLoading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('modelPricing.syncNow')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportData('');
        }}
        title={t('modelPricing.importTitle')}
      >
        <div className="space-y-4">
          <p className="text-gray-400">
            {t('modelPricing.importDesc')}
          </p>
          <div>
            <label className="block text-sm text-gray-400 mb-1">JSON Data</label>
            <textarea
              placeholder='[{"model": "claude-3-opus", "platform": "claude", "input_price": 0.015, "output_price": 0.075}]'
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              rows={8}
              className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-[#00F0FF] outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowImportModal(false);
                setImportData('');
              }}
            >
              {t('common:btn.cancel')}
            </Button>
            <Button onClick={handleImport} isLoading={importLoading} disabled={!importData}>
              <Upload className="w-4 h-4 mr-2" />
              {t('modelPricing.import')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Stats Modal */}
      <Modal
        isOpen={showStatsModal}
        onClose={() => {
          setShowStatsModal(false);
          setStats(null);
        }}
        title={t('modelPricing.statsTitle')}
      >
        {statsLoading ? (
          <div className="space-y-4">
            <Skeleton height={60} />
            <Skeleton height={60} />
            <Skeleton height={60} />
          </div>
        ) : stats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#0A0A0C] rounded-lg">
                <p className="text-xs text-gray-500 mb-1">{t('modelPricing.totalModels')}</p>
                <p className="text-xl font-bold text-white">{stats.total_models}</p>
              </div>
              <div className="p-4 bg-[#0A0A0C] rounded-lg">
                <p className="text-xs text-gray-500 mb-1">{t('modelPricing.activeModels')}</p>
                <p className="text-xl font-bold text-emerald-400">{stats.active_models}</p>
              </div>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-3">{t('modelPricing.byPlatform')}</p>
              <div className="space-y-2">
                {stats.platforms.map((p) => (
                  <div key={p.platform} className="flex items-center justify-between">
                    {getPlatformBadge(p.platform)}
                    <span className="text-sm text-gray-400">{p.count} models</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Failed to load stats</p>
        )}
      </Modal>
    </div>
  );
};

export default ModelPricingPage;
