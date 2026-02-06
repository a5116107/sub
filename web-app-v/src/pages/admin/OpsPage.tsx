import React, { useEffect, useState, useCallback } from 'react';
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

type TabType = 'errors' | 'request-errors' | 'upstream-errors' | 'requests' | 'alerts';

const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: 'errors', label: 'System Errors', icon: <AlertTriangle className="w-4 h-4" /> },
  { key: 'request-errors', label: 'Request Errors', icon: <XCircle className="w-4 h-4" /> },
  { key: 'upstream-errors', label: 'Upstream Errors', icon: <Server className="w-4 h-4" /> },
  { key: 'requests', label: 'Requests', icon: <Activity className="w-4 h-4" /> },
  { key: 'alerts', label: 'Alerts', icon: <Bell className="w-4 h-4" /> },
];

const getStatusBadge = (resolved: boolean) => {
  return resolved ? (
    <Badge variant="success">Resolved</Badge>
  ) : (
    <Badge variant="danger">Open</Badge>
  );
};

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case 'critical':
      return <Badge variant="danger">Critical</Badge>;
    case 'error':
      return <Badge variant="danger">Error</Badge>;
    case 'warning':
      return <Badge variant="warning">Warning</Badge>;
    case 'info':
      return <Badge variant="info">Info</Badge>;
    default:
      return <Badge variant="default">{severity}</Badge>;
  }
};

const getAlertStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge variant="danger">Active</Badge>;
    case 'acknowledged':
      return <Badge variant="warning">Acknowledged</Badge>;
    case 'resolved':
      return <Badge variant="success">Resolved</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
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

export const OpsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('errors');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

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
      title: 'ID',
      render: (item: OpsError) => <span className="text-sm text-gray-400">#{item.id}</span>,
    },
    {
      key: 'type',
      title: 'Type',
      render: (item: OpsError) => <span className="text-sm text-white">{item.type}</span>,
    },
    {
      key: 'message',
      title: 'Message',
      render: (item: OpsError) => (
        <p className="text-sm text-gray-300 truncate max-w-[300px]" title={item.message}>
          {item.message}
        </p>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (item: OpsError) => getStatusBadge(item.resolved),
    },
    {
      key: 'created_at',
      title: 'Created',
      render: (item: OpsError) => <span className="text-sm text-gray-400">{formatDate(item.created_at)}</span>,
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (item: OpsError) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedItem(item);
              setShowDetailModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {!item.resolved && (
            <>
              <button
                onClick={() => handleResolveError(item.id)}
                className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-emerald-400 transition-colors"
                title="Resolve"
                disabled={actionLoading}
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleRetryError(item.id)}
                className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-cyan-400 transition-colors"
                title="Retry"
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
      title: 'ID',
      render: (item: RequestError) => <span className="text-sm text-gray-400">#{item.id}</span>,
    },
    {
      key: 'request_id',
      title: 'Request ID',
      render: (item: RequestError) => (
        <span className="text-sm text-cyan-400 font-mono">{item.request_id.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'error_type',
      title: 'Type',
      render: (item: RequestError) => <span className="text-sm text-white">{item.error_type}</span>,
    },
    {
      key: 'model',
      title: 'Model',
      render: (item: RequestError) => <span className="text-sm text-gray-300">{item.model}</span>,
    },
    {
      key: 'status_code',
      title: 'Status',
      render: (item: RequestError) => (
        <Badge variant={item.status_code >= 500 ? 'danger' : 'warning'}>{item.status_code}</Badge>
      ),
    },
    {
      key: 'resolved',
      title: 'Resolved',
      render: (item: RequestError) => getStatusBadge(item.resolved),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (item: RequestError) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedItem(item);
              setShowDetailModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {!item.resolved && (
            <button
              onClick={() => handleResolveRequestError(item.id)}
              className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-emerald-400 transition-colors"
              title="Resolve"
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
      title: 'ID',
      render: (item: UpstreamError) => <span className="text-sm text-gray-400">#{item.id}</span>,
    },
    {
      key: 'account',
      title: 'Account',
      render: (item: UpstreamError) => (
        <div>
          <p className="text-sm text-white">{item.account_name || `Account #${item.account_id}`}</p>
          <p className="text-xs text-gray-500">{item.platform}</p>
        </div>
      ),
    },
    {
      key: 'error_type',
      title: 'Type',
      render: (item: UpstreamError) => <span className="text-sm text-white">{item.error_type}</span>,
    },
    {
      key: 'status_code',
      title: 'Status',
      render: (item: UpstreamError) => (
        <Badge variant={item.status_code >= 500 ? 'danger' : 'warning'}>{item.status_code}</Badge>
      ),
    },
    {
      key: 'resolved',
      title: 'Resolved',
      render: (item: UpstreamError) => getStatusBadge(item.resolved),
    },
    {
      key: 'created_at',
      title: 'Created',
      render: (item: UpstreamError) => <span className="text-sm text-gray-400">{formatDate(item.created_at)}</span>,
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (item: UpstreamError) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedItem(item);
              setShowDetailModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {!item.resolved && (
            <>
              <button
                onClick={() => handleResolveUpstreamError(item.id)}
                className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-emerald-400 transition-colors"
                title="Resolve"
                disabled={actionLoading}
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleRetryUpstreamError(item.id)}
                className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-cyan-400 transition-colors"
                title="Retry"
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
      title: 'ID',
      render: (item: OpsRequest) => <span className="text-sm text-gray-400">#{item.id}</span>,
    },
    {
      key: 'request_id',
      title: 'Request ID',
      render: (item: OpsRequest) => (
        <span className="text-sm text-cyan-400 font-mono">{item.request_id.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'model',
      title: 'Model',
      render: (item: OpsRequest) => <span className="text-sm text-white">{item.model}</span>,
    },
    {
      key: 'tokens',
      title: 'Tokens',
      render: (item: OpsRequest) => (
        <span className="text-sm text-gray-300">
          {item.input_tokens} / {item.output_tokens}
        </span>
      ),
    },
    {
      key: 'cost',
      title: 'Cost',
      render: (item: OpsRequest) => (
        <span className="text-sm text-emerald-400">${item.total_cost.toFixed(4)}</span>
      ),
    },
    {
      key: 'duration',
      title: 'Duration',
      render: (item: OpsRequest) => (
        <span className="text-sm text-gray-400">{item.duration_ms}ms</span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (item: OpsRequest) => (
        <Badge variant={item.status_code === 200 ? 'success' : 'danger'}>{item.status_code}</Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (item: OpsRequest) => (
        <button
          onClick={() => {
            setSelectedItem(item);
            setShowDetailModal(true);
          }}
          className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
          title="View Details"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const alertColumns = [
    {
      key: 'id',
      title: 'ID',
      render: (item: AlertEvent) => <span className="text-sm text-gray-400">#{item.id}</span>,
    },
    {
      key: 'severity',
      title: 'Severity',
      render: (item: AlertEvent) => getSeverityBadge(item.severity),
    },
    {
      key: 'title',
      title: 'Title',
      render: (item: AlertEvent) => <span className="text-sm text-white">{item.title}</span>,
    },
    {
      key: 'type',
      title: 'Type',
      render: (item: AlertEvent) => <span className="text-sm text-gray-300">{item.type}</span>,
    },
    {
      key: 'status',
      title: 'Status',
      render: (item: AlertEvent) => getAlertStatusBadge(item.status),
    },
    {
      key: 'created_at',
      title: 'Created',
      render: (item: AlertEvent) => <span className="text-sm text-gray-400">{formatDate(item.created_at)}</span>,
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (item: AlertEvent) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedItem(item);
              setShowDetailModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {item.status === 'active' && (
            <button
              onClick={() => handleUpdateAlertStatus(item.id, 'acknowledged')}
              className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-amber-400 transition-colors"
              title="Acknowledge"
              disabled={actionLoading}
            >
              <Bell className="w-4 h-4" />
            </button>
          )}
          {item.status !== 'resolved' && (
            <button
              onClick={() => handleUpdateAlertStatus(item.id, 'resolved')}
              className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-emerald-400 transition-colors"
              title="Resolve"
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
        title="Details"
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
              Close
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
        <h1 className="text-2xl font-bold text-white mb-1">Operations</h1>
        <p className="text-gray-400">Monitor errors, requests, and system alerts</p>
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

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            {activeTab === 'requests' ? (
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search by model..."
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
                  placeholder="Filter by type..."
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
                  <option value="">All Status</option>
                  {activeTab === 'alerts' ? (
                    <>
                      <option value="active">Active</option>
                      <option value="acknowledged">Acknowledged</option>
                      <option value="resolved">Resolved</option>
                    </>
                  ) : (
                    <>
                      <option value="open">Open</option>
                      <option value="resolved">Resolved</option>
                    </>
                  )}
                </select>
              </>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
              <Zap className="w-4 h-4" />
              <span>{total} total items</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {activeTab === 'errors' && <Table columns={errorColumns} data={errors} loading={loading} emptyText="No errors found" />}
          {activeTab === 'request-errors' && <Table columns={requestErrorColumns} data={requestErrors} loading={loading} emptyText="No request errors found" />}
          {activeTab === 'upstream-errors' && <Table columns={upstreamErrorColumns} data={upstreamErrors} loading={loading} emptyText="No upstream errors found" />}
          {activeTab === 'requests' && <Table columns={requestColumns} data={requests} loading={loading} emptyText="No requests found" />}
          {activeTab === 'alerts' && <Table columns={alertColumns} data={alerts} loading={loading} emptyText="No alerts found" />}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#2A2A30]">
              <p className="text-sm text-gray-400">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} items
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

      {/* Detail Modal */}
      {renderDetailModal()}
    </div>
  );
};

export default OpsPage;
