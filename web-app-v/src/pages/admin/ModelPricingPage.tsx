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

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return <Badge variant="success">Active</Badge>;
    case 'disabled':
      return <Badge variant="danger">Disabled</Badge>;
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
      title: 'ID',
      render: (item: ModelPricing) => (
        <span className="text-sm text-gray-400">#{item.id}</span>
      ),
    },
    {
      key: 'model',
      title: 'Model',
      render: (item: ModelPricing) => (
        <code className="text-sm font-mono text-cyan-400">{item.model}</code>
      ),
    },
    {
      key: 'platform',
      title: 'Platform',
      render: (item: ModelPricing) => getPlatformBadge(item.platform),
    },
    {
      key: 'input',
      title: 'Input Price',
      render: (item: ModelPricing) => (
        <span className="text-sm text-gray-400">{formatPrice(item.input_price)}/1K</span>
      ),
    },
    {
      key: 'output',
      title: 'Output Price',
      render: (item: ModelPricing) => (
        <span className="text-sm text-gray-400">{formatPrice(item.output_price)}/1K</span>
      ),
    },
    {
      key: 'cache',
      title: 'Cache Prices',
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
      title: 'Status',
      render: (item: ModelPricing) => getStatusBadge(item.status),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (item: ModelPricing) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(item)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedPricing(item);
              setShowDeleteModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-red-400 transition-colors"
            title="Delete"
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
          <label className="block text-sm text-gray-400 mb-1">Model Name *</label>
          <Input
            placeholder="claude-3-opus-20240229"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            disabled={isEdit}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Platform *</label>
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
          <label className="block text-sm text-gray-400 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
          >
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      <div className="border-t border-[#2A2A30] pt-4">
        <p className="text-sm text-gray-400 mb-3">Pricing (per 1K tokens)</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Input Price *</label>
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
            <label className="block text-xs text-gray-500 mb-1">Output Price *</label>
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
            <label className="block text-xs text-gray-500 mb-1">Cache Creation Price</label>
            <Input
              type="number"
              step="0.000001"
              min="0"
              placeholder="Optional"
              value={formData.cache_creation_price || ''}
              onChange={(e) => setFormData({ ...formData, cache_creation_price: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cache Read Price</label>
            <Input
              type="number"
              step="0.000001"
              min="0"
              placeholder="Optional"
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
            isEdit ? setShowEditModal(false) : setShowCreateModal(false);
            resetForm();
            setSelectedPricing(null);
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={isEdit ? handleUpdatePricing : handleCreatePricing}
          isLoading={actionLoading}
          disabled={!formData.model || !formData.platform}
        >
          {isEdit ? 'Update Pricing' : 'Create Pricing'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Model Pricing</h1>
          <p className="text-gray-400">Configure pricing for AI models</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleViewStats}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Stats
          </Button>
          <Button variant="secondary" onClick={() => setShowSyncModal(true)}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync
          </Button>
          <Button variant="secondary" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="secondary" onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Pricing
          </Button>
        </div>
      </div>

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
              <option value="">All Platforms</option>
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
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
            <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
              <DollarSign className="w-4 h-4" />
              <span>{total} models</span>
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
            emptyText="No pricing found"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#2A2A30]">
              <p className="text-sm text-gray-400">
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, total)} of {total} models
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
                  Page {page} of {totalPages}
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
        title="Add Model Pricing"
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
        title="Edit Model Pricing"
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
        title="Delete Pricing"
      >
        {selectedPricing && (
          <div className="space-y-4">
            <p className="text-gray-400">
              Are you sure you want to delete pricing for{' '}
              <code className="text-cyan-400 bg-[#0A0A0C] px-2 py-1 rounded">
                {selectedPricing.model}
              </code>
              ?
            </p>
            <p className="text-sm text-red-400">
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedPricing(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeletePricing}
                isLoading={actionLoading}
              >
                Delete Pricing
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
        title="Sync Pricing"
      >
        <div className="space-y-4">
          <p className="text-gray-400">
            Sync model pricing from upstream providers. This will update existing prices and add new models.
          </p>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Platform (optional)</label>
            <select
              value={syncPlatform}
              onChange={(e) => setSyncPlatform(e.target.value)}
              className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="">All Platforms</option>
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
              Close
            </Button>
            <Button onClick={handleSync} isLoading={syncLoading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync Now
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
        title="Import Pricing"
      >
        <div className="space-y-4">
          <p className="text-gray-400">
            Paste JSON data to import model pricing. Format should be an array of pricing objects.
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
              Cancel
            </Button>
            <Button onClick={handleImport} isLoading={importLoading} disabled={!importData}>
              <Upload className="w-4 h-4 mr-2" />
              Import
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
        title="Pricing Statistics"
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
                <p className="text-xs text-gray-500 mb-1">Total Models</p>
                <p className="text-xl font-bold text-white">{stats.total_models}</p>
              </div>
              <div className="p-4 bg-[#0A0A0C] rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Active Models</p>
                <p className="text-xl font-bold text-emerald-400">{stats.active_models}</p>
              </div>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-3">By Platform</p>
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
