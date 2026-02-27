import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Search,
  BarChart3,
  Trash2,
  List,
  Clock,
  X,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { adminUsageApi, type CleanupTask } from '../../api/admin/usage';
import type { UsageLog } from '../../types';
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

type TabType = 'logs' | 'cleanup-tasks';

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCost = (cost: number) => {
  return `$${cost.toFixed(6)}`;
};

interface UsageStats {
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  actual_cost: number;
  unique_users: number;
  unique_models: number;
}

interface CleanupResult {
  deleted_count: number;
  dry_run: boolean;
}

export const UsagePage: React.FC = () => {
  const { t } = useTranslation('admin');
  const [activeTab, setActiveTab] = useState<TabType>('logs');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="default">{t('usage.status.pending')}</Badge>;
      case 'running':
        return (
          <Badge variant="info" className="flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            {t('usage.status.running')}
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {t('usage.status.completed')}
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="danger" className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {t('usage.status.failed')}
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <X className="w-3 h-3" />
            {t('usage.status.cancelled')}
          </Badge>
        );
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  // Logs tab state
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Filters
  const [userIdFilter, setUserIdFilter] = useState<string>('');
  const [apiKeyIdFilter, setApiKeyIdFilter] = useState<string>('');
  const [modelFilter, setModelFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Autocomplete states
  const [userSuggestions, setUserSuggestions] = useState<Array<{ id: number; username: string; email: string }>>([]);
  const [apiKeySuggestions, setApiKeySuggestions] = useState<Array<{ id: number; name: string; user_id: number; username: string }>>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showApiKeyDropdown, setShowApiKeyDropdown] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [apiKeySearchQuery, setApiKeySearchQuery] = useState('');

  // Modal states
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [cleanupDate, setCleanupDate] = useState<string>('');
  const [cleanupActionLoading, setCleanupActionLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);

  // Cleanup tasks state
  const [cleanupTasks, setCleanupTasks] = useState<CleanupTask[]>([]);
  const [cleanupTasksLoading, setCleanupTasksLoading] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [newTaskDate, setNewTaskDate] = useState<string>('');
  const [newTaskDryRun, setNewTaskDryRun] = useState(false);
  const [createTaskLoading, setCreateTaskLoading] = useState(false);
  const [cancelTaskLoading, setCancelTaskLoading] = useState<number | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        page_size: pageSize,
      };
      if (userIdFilter) params.user_id = parseInt(userIdFilter);
      if (apiKeyIdFilter) params.api_key_id = parseInt(apiKeyIdFilter);
      if (modelFilter) params.model = modelFilter;
      if (dateFrom) params.start_date = new Date(dateFrom).toISOString();
      if (dateTo) params.end_date = new Date(dateTo).toISOString();

      const response = await adminUsageApi.getLogs(params as Parameters<typeof adminUsageApi.getLogs>[0]);
      setLogs(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch usage logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, userIdFilter, apiKeyIdFilter, modelFilter, dateFrom, dateTo]);

  const fetchCleanupTasks = useCallback(async () => {
    setCleanupTasksLoading(true);
    try {
      const tasks = await adminUsageApi.getCleanupTasks();
      setCleanupTasks(Array.isArray(tasks) ? tasks : []);
    } catch (error) {
      console.error('Failed to fetch cleanup tasks:', error);
      setCleanupTasks([]);
    } finally {
      setCleanupTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    } else {
      fetchCleanupTasks();
    }
  }, [activeTab, fetchLogs, fetchCleanupTasks]);

  // Auto-refresh cleanup tasks when on that tab
  useEffect(() => {
    if (activeTab !== 'cleanup-tasks') return;

    const interval = setInterval(() => {
      fetchCleanupTasks();
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab, fetchCleanupTasks]);

  // Debounced user search
  useEffect(() => {
    if (!userSearchQuery || userSearchQuery.length < 2) {
      setUserSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await adminUsageApi.searchUsers(userSearchQuery, 5);
        setUserSuggestions(Array.isArray(results) ? results : []);
        setShowUserDropdown(true);
      } catch (error) {
        console.error('Failed to search users:', error);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  // Debounced API key search
  useEffect(() => {
    if (!apiKeySearchQuery || apiKeySearchQuery.length < 2) {
      setApiKeySuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await adminUsageApi.searchApiKeys(apiKeySearchQuery, 5);
        setApiKeySuggestions(Array.isArray(results) ? results : []);
        setShowApiKeyDropdown(true);
      } catch (error) {
        console.error('Failed to search API keys:', error);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [apiKeySearchQuery]);

  const handleViewStats = async () => {
    setShowStatsModal(true);
    setStatsLoading(true);
    try {
      const params: { start_date?: string; end_date?: string } = {};
      if (dateFrom) params.start_date = new Date(dateFrom).toISOString();
      if (dateTo) params.end_date = new Date(dateTo).toISOString();

      const statsData = await adminUsageApi.getStats(params);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleOpenCleanup = () => {
    setShowCleanupModal(true);
    setCleanupResult(null);
  };

  const handleCreateCleanupTask = async () => {
    if (!cleanupDate) return;

    setCleanupActionLoading(true);
    try {
      const result = await adminUsageApi.cleanupLogs({
        before_date: new Date(cleanupDate).toISOString()
      });
      setCleanupResult(result);
      setCleanupDate('');
      // Refresh logs after cleanup
      fetchLogs();
    } catch (error) {
      console.error('Failed to cleanup logs:', error);
    } finally {
      setCleanupActionLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskDate) return;

    setCreateTaskLoading(true);
    try {
      await adminUsageApi.createCleanupTask({
        before_date: new Date(newTaskDate).toISOString(),
        dry_run: newTaskDryRun,
      });
      setShowCreateTaskModal(false);
      setNewTaskDate('');
      setNewTaskDryRun(false);
      fetchCleanupTasks();
    } catch (error) {
      console.error('Failed to create cleanup task:', error);
    } finally {
      setCreateTaskLoading(false);
    }
  };

  const handleCancelTask = async (taskId: number) => {
    setCancelTaskLoading(taskId);
    try {
      await adminUsageApi.cancelCleanupTask(taskId);
      fetchCleanupTasks();
    } catch (error) {
      console.error('Failed to cancel cleanup task:', error);
    } finally {
      setCancelTaskLoading(null);
    }
  };

  const handleClearFilters = () => {
    setUserIdFilter('');
    setApiKeyIdFilter('');
    setModelFilter('');
    setDateFrom('');
    setDateTo('');
    setUserSearchQuery('');
    setApiKeySearchQuery('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  const logColumns = [
    {
      key: 'id',
      title: t('usage.col.id'),
      render: (log: UsageLog) => (
        <span className="text-xs text-gray-500">#{log.id}</span>
      ),
    },
    {
      key: 'user',
      title: t('usage.col.user'),
      render: (log: UsageLog) => (
        <div className="text-sm">
          <p className="text-gray-400">User #{log.user_id}</p>
          <p className="text-xs text-gray-500">Key #{log.api_key_id}</p>
        </div>
      ),
    },
    {
      key: 'model',
      title: t('usage.col.model'),
      render: (log: UsageLog) => (
        <div>
          <p className="text-sm text-cyan-400 font-mono">{log.model}</p>
          {log.billed_model && log.billed_model !== log.model && (
            <p className="text-xs text-gray-500">{t('usage.billed', { model: log.billed_model })}</p>
          )}
        </div>
      ),
    },
    {
      key: 'tokens',
      title: t('usage.col.tokens'),
      render: (log: UsageLog) => (
        <div className="text-sm">
          <p className="text-gray-400">
            {t('usage.inputTokens', { count: log.input_tokens })}
          </p>
          <p className="text-gray-500">
            {t('usage.outputTokens', { count: log.output_tokens })}
          </p>
        </div>
      ),
    },
    {
      key: 'cost',
      title: t('usage.col.cost'),
      render: (log: UsageLog) => (
        <div className="text-sm">
          <p className="text-emerald-400">{formatCost(log.total_cost)}</p>
          {log.rate_multiplier !== 1 && (
            <p className="text-xs text-gray-500">{t('usage.rateMultiplier', { value: log.rate_multiplier })}</p>
          )}
        </div>
      ),
    },
    {
      key: 'latency',
      title: t('usage.col.latency'),
      render: (log: UsageLog) => (
        <div className="text-sm">
          {log.duration_ms ? (
            <>
              <p className="text-gray-400">{log.duration_ms}ms</p>
              {log.first_token_ms && (
                <p className="text-xs text-gray-500">TTFT: {log.first_token_ms}ms</p>
              )}
            </>
          ) : (
            <span className="text-gray-500">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'stream',
      title: t('usage.col.stream'),
      render: (log: UsageLog) => (
        <Badge variant={log.stream ? 'info' : 'default'}>
          {log.stream ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'time',
      title: t('usage.col.time'),
      render: (log: UsageLog) => (
        <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
      ),
    },
  ];

  const taskColumns = [
    {
      key: 'id',
      title: t('usage.col.id'),
      render: (task: CleanupTask) => (
        <span className="text-xs text-gray-500">#{task.id}</span>
      ),
    },
    {
      key: 'status',
      title: t('usage.col.status'),
      render: (task: CleanupTask) => getStatusBadge(task.status),
    },
    {
      key: 'before_date',
      title: t('usage.col.beforeDate'),
      render: (task: CleanupTask) => (
        <span className="text-sm text-gray-300">{formatDate(task.before_date)}</span>
      ),
    },
    {
      key: 'dry_run',
      title: t('usage.col.dryRun'),
      render: (task: CleanupTask) => (
        <Badge variant={task.dry_run ? 'info' : 'default'}>
          {task.dry_run ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'deleted_count',
      title: t('usage.col.deleted'),
      render: (task: CleanupTask) => (
        <span className="text-sm text-gray-300">
          {task.deleted_count.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'created_at',
      title: t('usage.col.created'),
      render: (task: CleanupTask) => (
        <span className="text-xs text-gray-400">{formatDate(task.created_at)}</span>
      ),
    },
    {
      key: 'completed_at',
      title: t('usage.col.completed'),
      render: (task: CleanupTask) => (
        <span className="text-xs text-gray-400">
          {task.completed_at ? formatDate(task.completed_at) : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: t('usage.col.actions'),
      render: (task: CleanupTask) => (
        <div className="flex items-center gap-2">
          {(task.status === 'pending' || task.status === 'running') && (
            <button
              onClick={() => handleCancelTask(task.id)}
              disabled={cancelTaskLoading === task.id}
              className="p-1.5 rounded hover:bg-[var(--accent-soft)] text-[var(--text-secondary)] hover:text-red-400 transition-colors"
              title={t('usage.action.cancelTask')}
            >
              {cancelTaskLoading === task.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">{t('usage.title')}</h1>
          <p className="text-[var(--text-secondary)]">{t('usage.subtitle')}</p>
        </div>
        {activeTab === 'logs' && (
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleViewStats}>
              <BarChart3 className="w-4 h-4 mr-2" />
              {t('usage.stats')}
            </Button>
            <Button variant="secondary" onClick={handleOpenCleanup}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t('usage.quickCleanup')}
            </Button>
          </div>
        )}
        {activeTab === 'cleanup-tasks' && (
          <Button onClick={() => setShowCreateTaskModal(true)}>
            <Play className="w-4 h-4 mr-2" />
            {t('usage.newCleanupTask')}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--border-color)]">
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'logs'
              ? 'text-red-400 border-red-400'
              : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
          }`}
        >
          <List className="w-4 h-4" />
          {t('usage.tab.logs')}
        </button>
        <button
          onClick={() => setActiveTab('cleanup-tasks')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'cleanup-tasks'
              ? 'text-red-400 border-red-400'
              : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
          }`}
        >
          <Clock className="w-4 h-4" />
          {t('usage.tab.cleanupTasks')}
          {cleanupTasks.some(ct => ct.status === 'running' || ct.status === 'pending') && (
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </button>
      </div>

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <>
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="relative flex items-center gap-2">
                  <Search className="w-4 h-4 text-[var(--text-muted)]" />
                  <div className="relative">
                    <Input
                      placeholder={t('usage.filter.userId')}
                      value={userIdFilter || userSearchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*$/.test(val)) {
                          setUserIdFilter(val);
                          setUserSearchQuery('');
                          setPage(1);
                        } else {
                          setUserSearchQuery(val);
                          setUserIdFilter('');
                        }
                      }}
                      onFocus={() => userSuggestions.length > 0 && setShowUserDropdown(true)}
                      onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                      className="w-40"
                    />
                    {showUserDropdown && userSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 mt-1 w-64 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                        {userSuggestions.map((user) => (
                          <button
                            key={user.id}
                            className="w-full px-3 py-2 text-left hover:bg-[var(--accent-soft)] transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setUserIdFilter(String(user.id));
                              setUserSearchQuery('');
                              setShowUserDropdown(false);
                              setPage(1);
                            }}
                          >
                            <p className="text-sm text-[var(--text-primary)]">{user.username}</p>
                            <p className="text-xs text-[var(--text-muted)]">{user.email} (ID: {user.id})</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <Input
                    placeholder={t('usage.filter.apiKeyId')}
                    value={apiKeyIdFilter || apiKeySearchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*$/.test(val)) {
                        setApiKeyIdFilter(val);
                        setApiKeySearchQuery('');
                        setPage(1);
                      } else {
                        setApiKeySearchQuery(val);
                        setApiKeyIdFilter('');
                      }
                    }}
                    onFocus={() => apiKeySuggestions.length > 0 && setShowApiKeyDropdown(true)}
                    onBlur={() => setTimeout(() => setShowApiKeyDropdown(false), 200)}
                    className="w-40"
                  />
                  {showApiKeyDropdown && apiKeySuggestions.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                      {apiKeySuggestions.map((key) => (
                        <button
                          key={key.id}
                          className="w-full px-3 py-2 text-left hover:bg-[var(--accent-soft)] transition-colors"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setApiKeyIdFilter(String(key.id));
                            setApiKeySearchQuery('');
                            setShowApiKeyDropdown(false);
                            setPage(1);
                          }}
                        >
                          <p className="text-sm text-[var(--text-primary)]">{key.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">{key.username} (ID: {key.id})</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Input
                  placeholder={t('usage.filter.model')}
                  value={modelFilter}
                  onChange={(e) => {
                    setModelFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-40"
                />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="w-36"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="w-36"
                />
                {(userIdFilter || apiKeyIdFilter || modelFilter || dateFrom || dateTo) && (
                  <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                    <RotateCcw className="w-4 h-4 mr-1" />
                    {t('common:btn.clear')}
                  </Button>
                )}
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] ml-auto">
                  <Activity className="w-4 h-4" />
                  <span>{t('usage.totalRecords', { count: total || 0 })}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Table */}
          <Card>
            <CardContent className="p-0">
              <Table
                columns={logColumns}
                data={logs}
                loading={loading}
                emptyText={t('usage.empty.logs')}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-color)]">
                  <p className="text-sm text-[var(--text-secondary)]">
                    {t('common:table.showing', { start: (page - 1) * pageSize + 1, end: Math.min(page * pageSize, total || 0), total: (total || 0).toLocaleString() })}
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
                    <span className="text-sm text-[var(--text-secondary)]">
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
        </>
      )}

      {/* Cleanup Tasks Tab */}
      {activeTab === 'cleanup-tasks' && (
        <Card>
          <CardContent className="p-0">
            <Table
              columns={taskColumns}
              data={cleanupTasks}
              loading={cleanupTasksLoading}
              emptyText={t('usage.empty.tasks')}
            />
          </CardContent>
        </Card>
      )}

      {/* Stats Modal */}
      <Modal
        isOpen={showStatsModal}
        onClose={() => {
          setShowStatsModal(false);
          setStats(null);
        }}
        title={t('usage.modal.statsTitle')}
      >
        {statsLoading ? (
          <div className="space-y-4">
            <Skeleton height={60} />
            <Skeleton height={60} />
            <Skeleton height={60} />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[var(--surface-elevated)] rounded-lg border border-[var(--border-color-subtle)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">{t('usage.stats.totalRequests')}</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats.total_requests.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-[var(--surface-elevated)] rounded-lg border border-[var(--border-color-subtle)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">{t('usage.stats.totalTokens')}</p>
              <p className="text-xl font-bold text-cyan-400">{stats.total_tokens.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-[var(--surface-elevated)] rounded-lg border border-[var(--border-color-subtle)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">{t('usage.stats.totalCost')}</p>
              <p className="text-xl font-bold text-emerald-400">${stats.total_cost.toFixed(4)}</p>
            </div>
            <div className="p-4 bg-[var(--surface-elevated)] rounded-lg border border-[var(--border-color-subtle)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">{t('usage.stats.actualCost')}</p>
              <p className="text-xl font-bold text-purple-400">${stats.actual_cost.toFixed(4)}</p>
            </div>
            <div className="p-4 bg-[var(--surface-elevated)] rounded-lg border border-[var(--border-color-subtle)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">{t('usage.stats.uniqueUsers')}</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats.unique_users}</p>
            </div>
            <div className="p-4 bg-[var(--surface-elevated)] rounded-lg border border-[var(--border-color-subtle)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">{t('usage.stats.uniqueModels')}</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats.unique_models}</p>
            </div>
          </div>
        ) : (
          <p className="text-[var(--text-secondary)]">{t('usage.stats.failedLoad')}</p>
        )}
      </Modal>

      {/* Quick Cleanup Modal */}
      <Modal
        isOpen={showCleanupModal}
        onClose={() => {
          setShowCleanupModal(false);
          setCleanupResult(null);
          setCleanupDate('');
        }}
        title={t('usage.modal.cleanupTitle')}
      >
        <div className="space-y-6">
          {/* Create new cleanup task */}
          <div className="p-4 bg-[var(--surface-elevated)] rounded-lg border border-[var(--border-color-subtle)]">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">{t('usage.cleanup.deleteOldLogs')}</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-[var(--text-muted)] mb-1">{t('usage.cleanup.deleteBefore')}</label>
                <Input
                  type="date"
                  value={cleanupDate}
                  onChange={(e) => setCleanupDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleCreateCleanupTask}
                  isLoading={cleanupActionLoading}
                  disabled={!cleanupDate}
                  variant="danger"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('common:btn.delete')}
                </Button>
              </div>
            </div>
            <p className="text-xs text-amber-400 mt-2">
              {t('usage.cleanup.warning')}
            </p>
          </div>

          {/* Cleanup result */}
          {cleanupResult && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <p className="text-sm text-emerald-400">
                {t('usage.cleanup.deleted', { count: cleanupResult.deleted_count })}
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Create Cleanup Task Modal */}
      <Modal
        isOpen={showCreateTaskModal}
        onClose={() => {
          setShowCreateTaskModal(false);
          setNewTaskDate('');
          setNewTaskDryRun(false);
        }}
        title={t('usage.modal.createTaskTitle')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">
              {t('usage.task.deleteBefore')} <span className="text-red-400">*</span>
            </label>
            <Input
              type="date"
              value={newTaskDate}
              onChange={(e) => setNewTaskDate(e.target.value)}
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {t('usage.task.deleteBeforeDesc')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setNewTaskDryRun(!newTaskDryRun)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                newTaskDryRun ? 'bg-blue-500' : 'bg-[var(--border-color)]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  newTaskDryRun ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <div>
              <span className="text-sm text-[var(--text-secondary)]">{t('usage.task.dryRunLabel')}</span>
              <p className="text-xs text-[var(--text-muted)]">
                {t('usage.task.dryRunDesc')}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateTaskModal(false);
                setNewTaskDate('');
                setNewTaskDryRun(false);
              }}
            >
              {t('common:btn.cancel')}
            </Button>
            <Button
              onClick={handleCreateTask}
              isLoading={createTaskLoading}
              disabled={!newTaskDate}
            >
              {t('usage.createTask')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsagePage;
