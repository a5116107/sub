import React, { useEffect, useState, useCallback } from 'react';
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

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return <Badge variant="success">Active</Badge>;
    case 'disabled':
      return <Badge variant="danger">Disabled</Badge>;
    case 'error':
      return <Badge variant="danger">Error</Badge>;
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
    } catch (error) {
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
    try {
      const statsData = await adminProxiesApi.getProxyStats(proxy.id);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
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
      key: 'id',
      title: 'ID',
      render: (proxy: Proxy) => (
        <span className="text-sm text-gray-400">#{proxy.id}</span>
      ),
    },
    {
      key: 'name',
      title: 'Name',
      render: (proxy: Proxy) => (
        <p className="text-sm font-medium text-white">{proxy.name}</p>
      ),
    },
    {
      key: 'protocol',
      title: 'Protocol',
      render: (proxy: Proxy) => getProtocolBadge(proxy.protocol),
    },
    {
      key: 'address',
      title: 'Address',
      render: (proxy: Proxy) => (
        <code className="text-sm font-mono text-gray-400">
          {proxy.host}:{proxy.port}
        </code>
      ),
    },
    {
      key: 'auth',
      title: 'Auth',
      render: (proxy: Proxy) => (
        <span className="text-sm text-gray-400">
          {proxy.username ? proxy.username : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (proxy: Proxy) => getStatusBadge(proxy.status),
    },
    {
      key: 'created',
      title: 'Created',
      render: (proxy: Proxy) => (
        <span className="text-sm text-gray-400">{formatDate(proxy.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (proxy: Proxy) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTestProxy(proxy)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-emerald-400 transition-colors"
            title="Test Proxy"
          >
            <Play className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleViewStats(proxy)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-cyan-400 transition-colors"
            title="View Stats"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEditModal(proxy)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title="Edit Proxy"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedProxy(proxy);
              setShowDeleteModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-red-400 transition-colors"
            title="Delete Proxy"
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
        <label className="block text-sm text-gray-400 mb-1">Name *</label>
        <Input
          placeholder="My Proxy"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Protocol *</label>
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
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className="block text-sm text-gray-400 mb-1">Host *</label>
          <Input
            placeholder="proxy.example.com"
            value={formData.host}
            onChange={(e) => setFormData({ ...formData, host: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Port *</label>
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
          <label className="block text-sm text-gray-400 mb-1">Username</label>
          <Input
            placeholder="Optional"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Password</label>
          <Input
            type="password"
            placeholder={isEdit ? 'Leave empty to keep current' : 'Optional'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button
          variant="secondary"
          onClick={() => {
            isEdit ? setShowEditModal(false) : setShowCreateModal(false);
            resetForm();
            setSelectedProxy(null);
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={isEdit ? handleUpdateProxy : handleCreateProxy}
          isLoading={actionLoading}
          disabled={!formData.name || !formData.host || !formData.port}
        >
          {isEdit ? 'Update Proxy' : 'Create Proxy'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Proxy Management</h1>
          <p className="text-gray-400">Configure and manage proxy servers</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Proxy
        </Button>
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
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="error">Error</option>
            </select>
            <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
              <Globe className="w-4 h-4" />
              <span>{total} total proxies</span>
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
            emptyText="No proxies found"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#2A2A30]">
              <p className="text-sm text-gray-400">
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, total)} of {total} proxies
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
        title="Add Proxy"
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
        title="Edit Proxy"
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
        title="Delete Proxy"
      >
        {selectedProxy && (
          <div className="space-y-4">
            <p className="text-gray-400">
              Are you sure you want to delete proxy{' '}
              <span className="text-white font-medium">{selectedProxy.name}</span>?
            </p>
            <p className="text-sm text-red-400">
              This action cannot be undone. Accounts using this proxy will be affected.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedProxy(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteProxy}
                isLoading={actionLoading}
              >
                Delete Proxy
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
        title={`Test: ${selectedProxy?.name || ''}`}
      >
        {testLoading ? (
          <div className="flex flex-col items-center py-8">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400">Testing proxy connection...</p>
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
                  {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                </p>
                <p className="text-sm text-gray-400">{testResult.message}</p>
              </div>
            </div>
            {testResult.success && (
              <div className="p-4 bg-[#0A0A0C] rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Latency</p>
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
        }}
        title={`Stats: ${selectedProxy?.name || ''}`}
      >
        {statsLoading ? (
          <div className="space-y-4">
            <Skeleton height={60} />
            <Skeleton height={60} />
            <Skeleton height={60} />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 gap-4">
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Total Accounts</p>
              <p className="text-xl font-bold text-white">{stats.total_accounts}</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Total Requests</p>
              <p className="text-xl font-bold text-cyan-400">{stats.total_requests.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Average Latency</p>
              <p className="text-xl font-bold text-emerald-400">{stats.avg_latency}ms</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Failed to load stats</p>
        )}
      </Modal>
    </div>
  );
};

export default ProxiesPage;
