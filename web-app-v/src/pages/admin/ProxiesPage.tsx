import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Play,
  BarChart3,
  CheckCircle,
  XCircle,
  Upload,
} from 'lucide-react';
import { adminProxiesApi, type ProxyQueryParams } from '../../api/admin/proxies';
import type { Proxy } from '../../types';
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
    case 'error':
      return <Badge variant="danger">{t('common:status.failed')}</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};

const getProtocolBadge = (protocol: string) => {
  const colors: Record<string, string> = {
    http: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    https: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    socks5: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    socks4: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };
  const colorClass = colors[protocol.toLowerCase()] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  return (
    <span className={`px-2 py-0.5 rounded text-xs border uppercase ${colorClass}`}>
      {protocol}
    </span>
  );
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

interface ProxyStats {
  total_accounts: number;
  total_requests: number;
  avg_latency: number;
}

interface TestResult {
  success: boolean;
  latency_ms: number;
  message: string;
}

export const ProxiesPage: React.FC = () => {
  const { t } = useTranslation('admin');
  const [loading, setLoading] = useState(true);
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modal states
  const [selectedProxy, setSelectedProxy] = useState<Proxy | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState<ProxyStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [showBatchImportModal, setShowBatchImportModal] = useState(false);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [batchImportData, setBatchImportData] = useState('');
  const [batchImportLoading, setBatchImportLoading] = useState(false);
  const [batchImportResult, setBatchImportResult] = useState<{ success_count: number; failed_count: number; errors: string[] } | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false);
  const [proxyAccounts, setProxyAccounts] = useState<Array<{ id: number; name: string; platform: string; status: string; last_used_at?: string }>>([]);
  const [proxyAccountsLoading, setProxyAccountsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Proxy> & { password?: string }>({
    name: '',
    protocol: 'http',
    host: '',
    port: 8080,
    username: '',
    password: '',
    status: 'active',
  });

  const fetchProxies = useCallback(async () => {
    setLoading(true);
    try {
      const params: ProxyQueryParams = {
        page,
        page_size: pageSize,
      };
      if (statusFilter) params.status = statusFilter;

      const response = await adminProxiesApi.getProxies(params);
      setProxies(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch proxies:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    fetchProxies();
  }, [fetchProxies]);

  const handleCreateProxy = async () => {
    if (!formData.name || !formData.host || !formData.port) return;

    setActionLoading(true);
    try {
      await adminProxiesApi.createProxy(formData);
      setShowCreateModal(false);
      resetForm();
      fetchProxies();
    } catch (error) {
      console.error('Failed to create proxy:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateProxy = async () => {
    if (!selectedProxy) return;

    setActionLoading(true);
    try {
      await adminProxiesApi.updateProxy(selectedProxy.id, formData);
      setShowEditModal(false);
      setSelectedProxy(null);
      resetForm();
      fetchProxies();
    } catch (error) {
      console.error('Failed to update proxy:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProxy = async () => {
    if (!selectedProxy) return;

    setActionLoading(true);
    try {
      await adminProxiesApi.deleteProxy(selectedProxy.id);
      setShowDeleteModal(false);
      setSelectedProxy(null);
      fetchProxies();
    } catch (error) {
      console.error('Failed to delete proxy:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestProxy = async (proxy: Proxy) => {
    setSelectedProxy(proxy);
    setShowTestModal(true);
    setTestLoading(true);
    setTestResult(null);
    try {
      const result = await adminProxiesApi.testProxy(proxy.id);
      setTestResult(result);
    } catch {
      setTestResult({
        success: false,
        latency_ms: 0,
        message: 'Failed to test proxy',
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleViewStats = async (proxy: Proxy) => {
    setSelectedProxy(proxy);
    setShowStatsModal(true);
    setStatsLoading(true);
    setProxyAccounts([]);
    setProxyAccountsLoading(true);
    try {
      const statsData = await adminProxiesApi.getProxyStats(proxy.id);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
    try {
      const accounts = await adminProxiesApi.getProxyAccounts(proxy.id);
      setProxyAccounts(accounts);
    } catch (error) {
      console.error('Failed to fetch proxy accounts:', error);
    } finally {
      setProxyAccountsLoading(false);
    }
  };

  const handleBatchImport = async () => {
    if (!batchImportData) return;
    setBatchImportLoading(true);
    setBatchImportResult(null);
    try {
      const parsed = JSON.parse(batchImportData);
      const proxiesArray = Array.isArray(parsed) ? parsed : [parsed];
      const result = await adminProxiesApi.batchCreate({ proxies: proxiesArray });
      setBatchImportResult(result);
      fetchProxies();
    } catch (error) {
      console.error('Failed to batch import proxies:', error);
    } finally {
      setBatchImportLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setBatchDeleteLoading(true);
    try {
      await adminProxiesApi.batchDelete(selectedIds);
      setSelectedIds([]);
      setShowBatchDeleteModal(false);
      fetchProxies();
    } catch (error) {
      console.error('Failed to batch delete proxies:', error);
    } finally {
      setBatchDeleteLoading(false);
    }
  };

  const toggleSelectProxy = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const openEditModal = (proxy: Proxy) => {
    setSelectedProxy(proxy);
    setFormData({
      name: proxy.name,
      protocol: proxy.protocol,
      host: proxy.host,
      port: proxy.port,
      username: proxy.username,
      password: '',
      status: proxy.status,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      protocol: 'http',
      host: '',
      port: 8080,
      username: '',
      password: '',
      status: 'active',
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  const columns = [
    {
      key: 'select',
      title: '',
      render: (proxy: Proxy) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(proxy.id)}
          onChange={() => toggleSelectProxy(proxy.id)}
          className="rounded border-[#2A2A30] bg-[#0A0A0C] text-cyan-500 focus:ring-cyan-500"
        />
      ),
    },
    {
      key: 'id',
      title: t('proxies.col.id'),
      render: (proxy: Proxy) => (
        <span className="text-sm text-gray-400">#{proxy.id}</span>
      ),
    },
    {
      key: 'name',
      title: t('proxies.col.name'),
      render: (proxy: Proxy) => (
        <p className="text-sm font-medium text-white">{proxy.name}</p>
      ),
    },
    {
      key: 'protocol',
      title: t('proxies.col.protocol'),
      render: (proxy: Proxy) => getProtocolBadge(proxy.protocol),
    },
    {
      key: 'address',
      title: t('proxies.col.address'),
      render: (proxy: Proxy) => (
        <code className="text-sm font-mono text-gray-400">
          {proxy.host}:{proxy.port}
        </code>
      ),
    },
    {
      key: 'auth',
      title: t('proxies.col.auth'),
      render: (proxy: Proxy) => (
        <span className="text-sm text-gray-400">
          {proxy.username ? proxy.username : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      title: t('proxies.col.status'),
      render: (proxy: Proxy) => getStatusBadge(proxy.status, t),
    },
    {
      key: 'created',
      title: t('proxies.col.created'),
      render: (proxy: Proxy) => (
        <span className="text-sm text-gray-400">{formatDate(proxy.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      title: t('proxies.col.actions'),
      render: (proxy: Proxy) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTestProxy(proxy)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-emerald-400 transition-colors"
            title={t('proxies.testTitle', { name: proxy.name })}
          >
            <Play className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleViewStats(proxy)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-cyan-400 transition-colors"
            title={t('proxies.statsTitle', { name: proxy.name })}
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEditModal(proxy)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title={t('proxies.editTitle')}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedProxy(proxy);
              setShowDeleteModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-red-400 transition-colors"
            title={t('proxies.deleteTitle')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const ProxyForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">{t('proxies.form.name')} *</label>
        <Input
          placeholder="My Proxy"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('proxies.form.protocol')} *</label>
          <select
            value={formData.protocol}
            onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
            className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
          >
            <option value="http">HTTP</option>
            <option value="https">HTTPS</option>
            <option value="socks5">SOCKS5</option>
            <option value="socks4">SOCKS4</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('proxies.form.status')}</label>
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
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className="block text-sm text-gray-400 mb-1">{t('proxies.form.host')} *</label>
          <Input
            placeholder="proxy.example.com"
            value={formData.host}
            onChange={(e) => setFormData({ ...formData, host: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('proxies.form.port')} *</label>
          <Input
            type="number"
            min="1"
            max="65535"
            placeholder="8080"
            value={formData.port}
            onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('proxies.form.username')}</label>
          <Input
            placeholder="Optional"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('proxies.form.password')}</label>
          <Input
            type="password"
            placeholder={isEdit ? t('proxies.form.passwordEditHint') : 'Optional'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
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
            setSelectedProxy(null);
          }}
        >
          {t('common:btn.cancel')}
        </Button>
        <Button
          onClick={isEdit ? handleUpdateProxy : handleCreateProxy}
          isLoading={actionLoading}
          disabled={!formData.name || !formData.host || !formData.port}
        >
          {isEdit ? t('proxies.updateProxy') : t('proxies.createProxy')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{t('proxies.title')}</h1>
          <p className="text-gray-400">{t('proxies.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {selectedIds.length > 0 && (
            <Button variant="danger" onClick={() => setShowBatchDeleteModal(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t('proxies.deleteSelected', { count: selectedIds.length })}
            </Button>
          )}
          <Button variant="secondary" onClick={() => { setShowBatchImportModal(true); setBatchImportResult(null); setBatchImportData(''); }}>
            <Upload className="w-4 h-4 mr-2" />
            {t('proxies.batchImport')}
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('proxies.addProxy')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="">{t('proxies.filter.allStatus')}</option>
              <option value="active">{t('common:status.active')}</option>
              <option value="disabled">{t('common:status.disabled')}</option>
              <option value="error">{t('common:status.failed')}</option>
            </select>
            <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
              <Globe className="w-4 h-4" />
              <span>{t('proxies.total', { count: total })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proxies Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={proxies}
            loading={loading}
            emptyText={t('proxies.empty')}
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
        title={t('proxies.createTitle')}
      >
        <ProxyForm />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedProxy(null);
          resetForm();
        }}
        title={t('proxies.editTitle')}
      >
        <ProxyForm isEdit />
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedProxy(null);
        }}
        title={t('proxies.deleteTitle')}
      >
        {selectedProxy && (
          <div className="space-y-4">
            <p className="text-gray-400">
              {t('proxies.deleteConfirm', { name: selectedProxy.name })}
            </p>
            <p className="text-sm text-red-400">
              {t('proxies.deleteWarning')}
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedProxy(null);
                }}
              >
                {t('common:btn.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteProxy}
                isLoading={actionLoading}
              >
                {t('proxies.deleteProxy')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Test Modal */}
      <Modal
        isOpen={showTestModal}
        onClose={() => {
          setShowTestModal(false);
          setSelectedProxy(null);
          setTestResult(null);
        }}
        title={t('proxies.testTitle', { name: selectedProxy?.name || '' })}
      >
        {testLoading ? (
          <div className="flex flex-col items-center py-8">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400">{t('proxies.testing')}</p>
          </div>
        ) : testResult ? (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              testResult.success ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'
            }`}>
              {testResult.success ? (
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400" />
              )}
              <div>
                <p className={`font-medium ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                  {testResult.success ? t('proxies.testSuccess') : t('proxies.testFailed')}
                </p>
                <p className="text-sm text-gray-400">{testResult.message}</p>
              </div>
            </div>
            {testResult.success && (
              <div className="p-4 bg-[#0A0A0C] rounded-lg">
                <p className="text-xs text-gray-500 mb-1">{t('proxies.testLatency')}</p>
                <p className="text-xl font-bold text-cyan-400">{testResult.latency_ms}ms</p>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Stats Modal */}
      <Modal
        isOpen={showStatsModal}
        onClose={() => {
          setShowStatsModal(false);
          setSelectedProxy(null);
          setStats(null);
          setProxyAccounts([]);
        }}
        title={t('proxies.statsTitle', { name: selectedProxy?.name || '' })}
      >
        {statsLoading ? (
          <div className="space-y-4">
            <Skeleton height={60} />
            <Skeleton height={60} />
            <Skeleton height={60} />
          </div>
        ) : stats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 bg-[#0A0A0C] rounded-lg">
                <p className="text-xs text-gray-500 mb-1">{t('proxies.stat.totalAccounts')}</p>
                <p className="text-xl font-bold text-white">{stats.total_accounts}</p>
              </div>
              <div className="p-4 bg-[#0A0A0C] rounded-lg">
                <p className="text-xs text-gray-500 mb-1">{t('proxies.stat.totalRequests')}</p>
                <p className="text-xl font-bold text-cyan-400">{stats.total_requests.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-[#0A0A0C] rounded-lg">
                <p className="text-xs text-gray-500 mb-1">{t('proxies.stat.avgLatency')}</p>
                <p className="text-xl font-bold text-emerald-400">{stats.avg_latency}ms</p>
              </div>
            </div>

            {/* Proxy Accounts Section */}
            <div className="border-t border-[#2A2A30] pt-4">
              <p className="text-sm text-gray-400 mb-3">{t('proxies.associatedAccounts')}</p>
              {proxyAccountsLoading ? (
                <Skeleton height={80} />
              ) : proxyAccounts.length > 0 ? (
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-[#121215]">
                      <tr className="border-b border-[#2A2A30]">
                        <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">{t('proxies.account.name')}</th>
                        <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">{t('proxies.account.platform')}</th>
                        <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">{t('proxies.account.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proxyAccounts.map((account) => (
                        <tr key={account.id} className="border-b border-[#2A2A30]/50">
                          <td className="py-2 px-3 text-sm text-white">{account.name}</td>
                          <td className="py-2 px-3 text-sm text-gray-400">{account.platform}</td>
                          <td className="py-2 px-3">
                            {getStatusBadge(account.status, t)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">{t('proxies.noAccounts')}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Failed to load stats</p>
        )}
      </Modal>

      {/* Batch Import Modal */}
      <Modal
        isOpen={showBatchImportModal}
        onClose={() => {
          setShowBatchImportModal(false);
          setBatchImportData('');
          setBatchImportResult(null);
        }}
        title={t('proxies.batchImportTitle')}
      >
        <div className="space-y-4">
          <p className="text-gray-400">{t('proxies.batchImportDesc')}</p>
          <div>
            <label className="block text-sm text-gray-400 mb-1">JSON</label>
            <textarea
              placeholder={'[{"name": "Proxy 1", "protocol": "http", "host": "1.2.3.4", "port": 8080}]'}
              value={batchImportData}
              onChange={(e) => setBatchImportData(e.target.value)}
              rows={8}
              className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-[#00F0FF] outline-none resize-none"
            />
          </div>
          {batchImportResult && (
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-sm text-emerald-400 mb-1">
                {t('proxies.batchImportSuccess', { count: batchImportResult.success_count })}
              </p>
              {batchImportResult.failed_count > 0 && (
                <p className="text-sm text-red-400">
                  {t('proxies.batchImportFailed', { count: batchImportResult.failed_count })}
                </p>
              )}
              {batchImportResult.errors.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  {batchImportResult.errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowBatchImportModal(false);
                setBatchImportData('');
                setBatchImportResult(null);
              }}
            >
              {t('common:btn.cancel')}
            </Button>
            <Button onClick={handleBatchImport} isLoading={batchImportLoading} disabled={!batchImportData}>
              <Upload className="w-4 h-4 mr-2" />
              {t('proxies.batchImport')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Batch Delete Modal */}
      <Modal
        isOpen={showBatchDeleteModal}
        onClose={() => setShowBatchDeleteModal(false)}
        title={t('proxies.batchDeleteTitle')}
      >
        <div className="space-y-4">
          <p className="text-gray-400">
            {t('proxies.batchDeleteConfirm', { count: selectedIds.length })}
          </p>
          <p className="text-sm text-red-400">
            {t('proxies.deleteWarning')}
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowBatchDeleteModal(false)}>
              {t('common:btn.cancel')}
            </Button>
            <Button variant="danger" onClick={handleBatchDelete} isLoading={batchDeleteLoading}>
              {t('proxies.deleteSelected', { count: selectedIds.length })}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProxiesPage;
