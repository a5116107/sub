import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Server,
  Zap,
  Activity,
  Gauge,
  Settings,
  LayoutDashboard,
  List,
} from 'lucide-react';
import {
  adminOpsApi,
  type OpsError,
  type RequestError,
  type UpstreamError,
  type OpsRequest,
  type AlertEvent,
  type ErrorQueryParams,
  type RequestErrorQueryParams,
  type UpstreamErrorQueryParams,
  type RequestQueryParams,
  type AlertEventQueryParams,
} from '../../api/admin/ops';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  Table,
  Modal,
} from '../../components/ui';
import { OpsMonitoringTab } from './components/OpsMonitoringTab';
import { OpsAlertRulesTab } from './components/OpsAlertRulesTab';
import { OpsSettingsTab } from './components/OpsSettingsTab';
import { OpsDashboardTab } from './components/OpsDashboardTab';

type TabType = 'dashboard' | 'monitoring' | 'errors' | 'request-errors' | 'upstream-errors' | 'requests' | 'alerts' | 'alert-rules' | 'settings';

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const OpsPage: React.FC = () => {
  const { t } = useTranslation('admin');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: t('ops.tab.dashboard'), icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'monitoring', label: t('ops.tab.monitoring'), icon: <Gauge className="w-4 h-4" /> },
    { key: 'errors', label: t('ops.tab.errors'), icon: <AlertTriangle className="w-4 h-4" /> },
    { key: 'request-errors', label: t('ops.tab.requestErrors'), icon: <XCircle className="w-4 h-4" /> },
    { key: 'upstream-errors', label: t('ops.tab.upstreamErrors'), icon: <Server className="w-4 h-4" /> },
    { key: 'requests', label: t('ops.tab.requests'), icon: <Activity className="w-4 h-4" /> },
    { key: 'alerts', label: t('ops.tab.alerts'), icon: <Bell className="w-4 h-4" /> },
    { key: 'alert-rules', label: t('ops.tab.alertRules'), icon: <List className="w-4 h-4" /> },
    { key: 'settings', label: t('ops.tab.settings'), icon: <Settings className="w-4 h-4" /> },
  ];

  const getStatusBadge = (resolved: boolean) => {
    return resolved ? (
      <Badge variant="success">{t('ops.status.resolved')}</Badge>
    ) : (
      <Badge variant="danger">{t('ops.status.open')}</Badge>
    );
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="danger">{t('ops.severity.critical')}</Badge>;
      case 'error':
        return <Badge variant="danger">{t('ops.severity.error')}</Badge>;
      case 'warning':
        return <Badge variant="warning">{t('ops.severity.warning')}</Badge>;
      case 'info':
        return <Badge variant="info">{t('ops.severity.info')}</Badge>;
      default:
        return <Badge variant="default">{severity}</Badge>;
    }
  };

  const getAlertStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="danger">{t('ops.status.active')}</Badge>;
      case 'acknowledged':
        return <Badge variant="warning">{t('ops.status.acknowledged')}</Badge>;
      case 'resolved':
        return <Badge variant="success">{t('ops.status.resolved')}</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  // Data states
  const [errors, setErrors] = useState<OpsError[]>([]);
  const [requestErrors, setRequestErrors] = useState<RequestError[]>([]);
  const [upstreamErrors, setUpstreamErrors] = useState<UpstreamError[]>([]);
  const [requests, setRequests] = useState<OpsRequest[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);

  // Filter states
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OpsError | RequestError | UpstreamError | OpsRequest | AlertEvent | null>(null);

  // Fetch functions
  const fetchErrors = useCallback(async () => {
    setLoading(true);
    try {
      const params: ErrorQueryParams = { page, page_size: pageSize };
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.resolved = statusFilter === 'resolved';
      const response = await adminOpsApi.getErrors(params);
      setErrors(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch errors:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, typeFilter, statusFilter]);

  const fetchRequestErrors = useCallback(async () => {
    setLoading(true);
    try {
      const params: RequestErrorQueryParams = { page, page_size: pageSize };
      if (typeFilter) params.error_type = typeFilter;
      if (statusFilter) params.resolved = statusFilter === 'resolved';
      const response = await adminOpsApi.getRequestErrors(params);
      setRequestErrors(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch request errors:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, typeFilter, statusFilter]);

  const fetchUpstreamErrors = useCallback(async () => {
    setLoading(true);
    try {
      const params: UpstreamErrorQueryParams = { page, page_size: pageSize };
      if (typeFilter) params.error_type = typeFilter;
      if (statusFilter) params.resolved = statusFilter === 'resolved';
      const response = await adminOpsApi.getUpstreamErrors(params);
      setUpstreamErrors(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch upstream errors:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, typeFilter, statusFilter]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params: RequestQueryParams = { page, page_size: pageSize };
      if (searchQuery) params.model = searchQuery;
      const response = await adminOpsApi.getRequests(params);
      setRequests(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery]);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params: AlertEventQueryParams = { page, page_size: pageSize };
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      const response = await adminOpsApi.getAlertEvents(params);
      setAlerts(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, typeFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
    setTypeFilter('');
    setStatusFilter('');
    setSearchQuery('');
  }, [activeTab]);

  useEffect(() => {
    switch (activeTab) {
      case 'errors':
        fetchErrors();
        break;
      case 'request-errors':
        fetchRequestErrors();
        break;
      case 'upstream-errors':
        fetchUpstreamErrors();
        break;
      case 'requests':
        fetchRequests();
        break;
      case 'alerts':
        fetchAlerts();
        break;
    }
  }, [activeTab, fetchErrors, fetchRequestErrors, fetchUpstreamErrors, fetchRequests, fetchAlerts]);

  // Action handlers
  const handleResolveError = async (id: number) => {
    setActionLoading(true);
    try {
      await adminOpsApi.resolveError(id);
      fetchErrors();
    } catch (error) {
      console.error('Failed to resolve error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryError = async (id: number) => {
    setActionLoading(true);
    try {
      await adminOpsApi.retryError(id);
      fetchErrors();
    } catch (error) {
      console.error('Failed to retry error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveRequestError = async (id: number) => {
    setActionLoading(true);
    try {
      await adminOpsApi.resolveRequestError(id);
      fetchRequestErrors();
    } catch (error) {
      console.error('Failed to resolve request error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveUpstreamError = async (id: number) => {
    setActionLoading(true);
    try {
      await adminOpsApi.resolveUpstreamError(id);
      fetchUpstreamErrors();
    } catch (error) {
      console.error('Failed to resolve upstream error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryUpstreamError = async (id: number) => {
    setActionLoading(true);
    try {
      await adminOpsApi.retryUpstreamError(id);
      fetchUpstreamErrors();
    } catch (error) {
      console.error('Failed to retry upstream error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateAlertStatus = async (id: number, status: 'acknowledged' | 'resolved') => {
    setActionLoading(true);
    try {
      await adminOpsApi.updateAlertEventStatus(id, status);
      fetchAlerts();
    } catch (error) {
      console.error('Failed to update alert status:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  // Column definitions
  const errorColumns = [
    {
      key: 'id',
      title: t('ops.col.id'),
      render: (item: OpsError) => <span className="text-sm text-gray-400">#{item.id}</span>,
    },
    {
      key: 'type',
      title: t('ops.col.type'),
      render: (item: OpsError) => <span className="text-sm text-white">{item.type}</span>,
    },
    {
      key: 'message',
      title: t('ops.col.message'),
      render: (item: OpsError) => (
        <p className="text-sm text-gray-300 truncate max-w-[300px]" title={item.message}>
          {item.message}
        </p>
      ),
    },
    {
      key: 'status',
      title: t('ops.col.status'),
      render: (item: OpsError) => getStatusBadge(item.resolved),
    },
    {
      key: 'created_at',
      title: t('ops.col.created'),
      render: (item: OpsError) => <span className="text-sm text-gray-400">{formatDate(item.created_at)}</span>,
    },
    {
      key: 'actions',
      title: t('ops.col.actions'),
      render: (item: OpsError) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedItem(item);
              setShowDetailModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title={t('ops.action.viewDetails')}
          >
            <Eye className="w-4 h-4" />
          </button>
          {!item.resolved && (
            <>
              <button
                onClick={() => handleResolveError(item.id)}
                className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-emerald-400 transition-colors"
                title={t('ops.action.resolve')}
                disabled={actionLoading}
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleRetryError(item.id)}
                className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-cyan-400 transition-colors"
                title={t('ops.action.retry')}
                disabled={actionLoading}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const requestErrorColumns = [
    {
      key: 'id',
      title: t('ops.col.id'),
      render: (item: RequestError) => <span className="text-sm text-gray-400">#{item.id}</span>,
    },
    {
      key: 'request_id',
      title: t('ops.col.requestId'),
      render: (item: RequestError) => (
        <span className="text-sm text-cyan-400 font-mono">{item.request_id.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'error_type',
      title: t('ops.col.type'),
      render: (item: RequestError) => <span className="text-sm text-white">{item.error_type}</span>,
    },
    {
      key: 'model',
      title: t('ops.col.model'),
      render: (item: RequestError) => <span className="text-sm text-gray-300">{item.model}</span>,
    },
    {
      key: 'status_code',
      title: t('ops.col.statusCode'),
      render: (item: RequestError) => (
        <Badge variant={item.status_code >= 500 ? 'danger' : 'warning'}>{item.status_code}</Badge>
      ),
    },
    {
      key: 'resolved',
      title: t('ops.col.resolved'),
      render: (item: RequestError) => getStatusBadge(item.resolved),
    },
    {
      key: 'actions',
      title: t('ops.col.actions'),
      render: (item: RequestError) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedItem(item);
              setShowDetailModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title={t('ops.action.viewDetails')}
          >
            <Eye className="w-4 h-4" />
          </button>
          {!item.resolved && (
            <button
              onClick={() => handleResolveRequestError(item.id)}
              className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-emerald-400 transition-colors"
              title={t('ops.action.resolve')}
              disabled={actionLoading}
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const upstreamErrorColumns = [
    {
      key: 'id',
      title: t('ops.col.id'),
      render: (item: UpstreamError) => <span className="text-sm text-gray-400">#{item.id}</span>,
    },
    {
      key: 'account',
      title: t('ops.col.account'),
      render: (item: UpstreamError) => (
        <div>
          <p className="text-sm text-white">{item.account_name || `Account #${item.account_id}`}</p>
          <p className="text-xs text-gray-500">{item.platform}</p>
        </div>
      ),
    },
    {
      key: 'error_type',
      title: t('ops.col.type'),
      render: (item: UpstreamError) => <span className="text-sm text-white">{item.error_type}</span>,
    },
    {
      key: 'status_code',
      title: t('ops.col.statusCode'),
      render: (item: UpstreamError) => (
        <Badge variant={item.status_code >= 500 ? 'danger' : 'warning'}>{item.status_code}</Badge>
      ),
    },
    {
      key: 'resolved',
      title: t('ops.col.resolved'),
      render: (item: UpstreamError) => getStatusBadge(item.resolved),
    },
    {
      key: 'created_at',
      title: t('ops.col.created'),
      render: (item: UpstreamError) => <span className="text-sm text-gray-400">{formatDate(item.created_at)}</span>,
    },
    {
      key: 'actions',
      title: t('ops.col.actions'),
      render: (item: UpstreamError) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedItem(item);
              setShowDetailModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title={t('ops.action.viewDetails')}
          >
            <Eye className="w-4 h-4" />
          </button>
          {!item.resolved && (
            <>
              <button
                onClick={() => handleResolveUpstreamError(item.id)}
                className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-emerald-400 transition-colors"
                title={t('ops.action.resolve')}
                disabled={actionLoading}
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleRetryUpstreamError(item.id)}
                className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-cyan-400 transition-colors"
                title={t('ops.action.retry')}
                disabled={actionLoading}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const requestColumns = [
    {
      key: 'id',
      title: t('ops.col.id'),
      render: (item: OpsRequest) => <span className="text-sm text-gray-400">#{item.id}</span>,
    },
    {
      key: 'request_id',
      title: t('ops.col.requestId'),
      render: (item: OpsRequest) => (
        <span className="text-sm text-cyan-400 font-mono">{item.request_id.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'model',
      title: t('ops.col.model'),
      render: (item: OpsRequest) => <span className="text-sm text-white">{item.model}</span>,
    },
    {
      key: 'tokens',
      title: t('ops.col.tokens'),
      render: (item: OpsRequest) => (
        <span className="text-sm text-gray-300">
          {item.input_tokens} / {item.output_tokens}
        </span>
      ),
    },
    {
      key: 'cost',
      title: t('ops.col.cost'),
      render: (item: OpsRequest) => (
        <span className="text-sm text-emerald-400">${item.total_cost.toFixed(4)}</span>
      ),
    },
    {
      key: 'duration',
      title: t('ops.col.duration'),
      render: (item: OpsRequest) => (
        <span className="text-sm text-gray-400">{item.duration_ms}ms</span>
      ),
    },
    {
      key: 'status',
      title: t('ops.col.status'),
      render: (item: OpsRequest) => (
        <Badge variant={item.status_code === 200 ? 'success' : 'danger'}>{item.status_code}</Badge>
      ),
    },
    {
      key: 'actions',
      title: t('ops.col.actions'),
      render: (item: OpsRequest) => (
        <button
          onClick={() => {
            setSelectedItem(item);
            setShowDetailModal(true);
          }}
          className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
          title={t('ops.action.viewDetails')}
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const alertColumns = [
    {
      key: 'id',
      title: t('ops.col.id'),
      render: (item: AlertEvent) => <span className="text-sm text-gray-400">#{item.id}</span>,
    },
    {
      key: 'severity',
      title: t('ops.col.severity'),
      render: (item: AlertEvent) => getSeverityBadge(item.severity),
    },
    {
      key: 'title',
      title: t('ops.col.title'),
      render: (item: AlertEvent) => <span className="text-sm text-white">{item.title}</span>,
    },
    {
      key: 'type',
      title: t('ops.col.type'),
      render: (item: AlertEvent) => <span className="text-sm text-gray-300">{item.type}</span>,
    },
    {
      key: 'status',
      title: t('ops.col.status'),
      render: (item: AlertEvent) => getAlertStatusBadge(item.status),
    },
    {
      key: 'created_at',
      title: t('ops.col.created'),
      render: (item: AlertEvent) => <span className="text-sm text-gray-400">{formatDate(item.created_at)}</span>,
    },
    {
      key: 'actions',
      title: t('ops.col.actions'),
      render: (item: AlertEvent) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedItem(item);
              setShowDetailModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title={t('ops.action.viewDetails')}
          >
            <Eye className="w-4 h-4" />
          </button>
          {item.status === 'active' && (
            <button
              onClick={() => handleUpdateAlertStatus(item.id, 'acknowledged')}
              className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-amber-400 transition-colors"
              title={t('ops.action.acknowledge')}
              disabled={actionLoading}
            >
              <Bell className="w-4 h-4" />
            </button>
          )}
          {item.status !== 'resolved' && (
            <button
              onClick={() => handleUpdateAlertStatus(item.id, 'resolved')}
              className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-emerald-400 transition-colors"
              title={t('ops.action.resolve')}
              disabled={actionLoading}
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];


  const renderDetailModal = () => {
    if (!selectedItem) return null;

    return (
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedItem(null);
        }}
        title={t('ops.modal.detailTitle')}
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <pre className="bg-[#0A0A0C] border border-[#2A2A30] rounded-lg p-4 text-sm text-gray-300 overflow-x-auto">
            {JSON.stringify(selectedItem, null, 2)}
          </pre>
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDetailModal(false);
                setSelectedItem(null);
              }}
            >
              {t('common:btn.close')}
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">{t('ops.title')}</h1>
        <p className="text-gray-400">{t('ops.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30'
                : 'bg-[#1A1A1F] text-gray-400 border border-[#2A2A30] hover:text-white hover:border-[#3A3A40]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* New Tab Content (full-page tabs) */}
      {activeTab === 'dashboard' && <OpsDashboardTab />}
      {activeTab === 'monitoring' && <OpsMonitoringTab />}
      {activeTab === 'alert-rules' && <OpsAlertRulesTab />}
      {activeTab === 'settings' && <OpsSettingsTab />}

      {/* Data Table Tabs - Filters */}
      {!['dashboard', 'monitoring', 'alert-rules', 'settings'].includes(activeTab) && (<>
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            {activeTab === 'requests' ? (
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder={t('ops.filter.searchModel')}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            ) : (
              <>
                <Input
                  placeholder={t('ops.filter.type')}
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-48"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
                >
                  <option value="">{t('ops.filter.allStatus')}</option>
                  {activeTab === 'alerts' ? (
                    <>
                      <option value="active">{t('ops.filter.active')}</option>
                      <option value="acknowledged">{t('ops.filter.acknowledged')}</option>
                      <option value="resolved">{t('ops.filter.resolved')}</option>
                    </>
                  ) : (
                    <>
                      <option value="open">{t('ops.filter.open')}</option>
                      <option value="resolved">{t('ops.filter.resolved')}</option>
                    </>
                  )}
                </select>
              </>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
              <Zap className="w-4 h-4" />
              <span>{t('ops.totalItems', { count: total })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {activeTab === 'errors' && <Table columns={errorColumns} data={errors} loading={loading} emptyText={t('ops.empty.errors')} />}
          {activeTab === 'request-errors' && <Table columns={requestErrorColumns} data={requestErrors} loading={loading} emptyText={t('ops.empty.requestErrors')} />}
          {activeTab === 'upstream-errors' && <Table columns={upstreamErrorColumns} data={upstreamErrors} loading={loading} emptyText={t('ops.empty.upstreamErrors')} />}
          {activeTab === 'requests' && <Table columns={requestColumns} data={requests} loading={loading} emptyText={t('ops.empty.requests')} />}
          {activeTab === 'alerts' && <Table columns={alertColumns} data={alerts} loading={loading} emptyText={t('ops.empty.alerts')} />}

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
      </>)}

      {/* Detail Modal */}
      {renderDetailModal()}
    </div>
  );
};

export default OpsPage;
