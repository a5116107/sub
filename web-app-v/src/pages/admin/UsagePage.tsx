import React, { useEffect, useState, useCallback } from 'react';
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

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <Badge variant="default">Pending</Badge>;
    case 'running':
      return (
        <Badge variant="info" className="flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Running
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Completed
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="danger" className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Failed
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <X className="w-3 h-3" />
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};

export const UsagePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('logs');

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
      setCleanupTasks(tasks);
    } catch (error) {
      console.error('Failed to fetch cleanup tasks:', error);
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
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  const logColumns = [
    {
      key: 'id',
      title: 'ID',
      render: (log: UsageLog) => (
        <span className="text-xs text-gray-500">#{log.id}</span>
      ),
    },
    {
      key: 'user',
      title: 'User',
      render: (log: UsageLog) => (
        <div className="text-sm">
          <p className="text-gray-400">User #{log.user_id}</p>
          <p className="text-xs text-gray-500">Key #{log.api_key_id}</p>
        </div>
      ),
    },
    {
      key: 'model',
      title: 'Model',
      render: (log: UsageLog) => (
        <div>
          <p className="text-sm text-cyan-400 font-mono">{log.model}</p>
          {log.billed_model && log.billed_model !== log.model && (
            <p className="text-xs text-gray-500">Billed: {log.billed_model}</p>
          )}
        </div>
      ),
    },
    {
      key: 'tokens',
      title: 'Tokens',
      render: (log: UsageLog) => (
        <div className="text-sm">
          <p className="text-gray-400">
            In: {log.input_tokens.toLocaleString()}
          </p>
          <p className="text-gray-500">
            Out: {log.output_tokens.toLocaleString()}
          </p>
        </div>
      ),
    },
    {
      key: 'cost',
      title: 'Cost',
      render: (log: UsageLog) => (
        <div className="text-sm">
          <p className="text-emerald-400">{formatCost(log.total_cost)}</p>
          {log.rate_multiplier !== 1 && (
            <p className="text-xs text-gray-500">{log.rate_multiplier}x rate</p>
          )}
        </div>
      ),
    },
    {
      key: 'latency',
      title: 'Latency',
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
      title: 'Stream',
      render: (log: UsageLog) => (
        <Badge variant={log.stream ? 'info' : 'default'}>
          {log.stream ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'time',
      title: 'Time',
      render: (log: UsageLog) => (
        <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
      ),
    },
  ];

  const taskColumns = [
    {
      key: 'id',
      title: 'ID',
      render: (task: CleanupTask) => (
        <span className="text-xs text-gray-500">#{task.id}</span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (task: CleanupTask) => getStatusBadge(task.status),
    },
    {
      key: 'before_date',
      title: 'Before Date',
      render: (task: CleanupTask) => (
        <span className="text-sm text-gray-300">{formatDate(task.before_date)}</span>
      ),
    },
    {
      key: 'dry_run',
      title: 'Dry Run',
      render: (task: CleanupTask) => (
        <Badge variant={task.dry_run ? 'info' : 'default'}>
          {task.dry_run ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'deleted_count',
      title: 'Deleted',
      render: (task: CleanupTask) => (
        <span className="text-sm text-gray-300">
          {task.deleted_count.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'created_at',
      title: 'Created',
      render: (task: CleanupTask) => (
        <span className="text-xs text-gray-400">{formatDate(task.created_at)}</span>
      ),
    },
    {
      key: 'completed_at',
      title: 'Completed',
      render: (task: CleanupTask) => (
        <span className="text-xs text-gray-400">
          {task.completed_at ? formatDate(task.completed_at) : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (task: CleanupTask) => (
        <div className="flex items-center gap-2">
          {(task.status === 'pending' || task.status === 'running') && (
            <button
              onClick={() => handleCancelTask(task.id)}
              disabled={cancelTaskLoading === task.id}
              className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-red-400 transition-colors"
              title="Cancel Task"
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
          <h1 className="text-2xl font-bold text-white mb-1">Usage Management</h1>
          <p className="text-gray-400">View usage logs and manage cleanup tasks</p>
        </div>
        {activeTab === 'logs' && (
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleViewStats}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Stats
            </Button>
            <Button variant="secondary" onClick={handleOpenCleanup}>
              <Trash2 className="w-4 h-4 mr-2" />
              Quick Cleanup
            </Button>
          </div>
        )}
        {activeTab === 'cleanup-tasks' && (
          <Button onClick={() => setShowCreateTaskModal(true)}>
            <Play className="w-4 h-4 mr-2" />
            New Cleanup Task
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#2A2A30]">
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'logs'
              ? 'text-red-400 border-red-400'
              : 'text-gray-400 border-transparent hover:text-white'
          }`}
        >
          <List className="w-4 h-4" />
          Usage Logs
        </button>
        <button
          onClick={() => setActiveTab('cleanup-tasks')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'cleanup-tasks'
              ? 'text-red-400 border-red-400'
              : 'text-gray-400 border-transparent hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          Cleanup Tasks
          {cleanupTasks.some(t => t.status === 'running' || t.status === 'pending') && (
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
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="User ID"
                    value={userIdFilter}
                    onChange={(e) => {
                      setUserIdFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-24"
                  />
                </div>
                <Input
                  placeholder="API Key ID"
                  value={apiKeyIdFilter}
                  onChange={(e) => {
                    setApiKeyIdFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-28"
                />
                <Input
                  placeholder="Model"
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
                    Clear
                  </Button>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
                  <Activity className="w-4 h-4" />
                  <span>{(total || 0).toLocaleString()} records</span>
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
                emptyText="No usage logs found"
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-[#2A2A30]">
                  <p className="text-sm text-gray-400">
                    Showing {(page - 1) * pageSize + 1} to{' '}
                    {Math.min(page * pageSize, total || 0)} of {(total || 0).toLocaleString()} records
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
              emptyText="No cleanup tasks found"
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
        title="Usage Statistics"
      >
        {statsLoading ? (
          <div className="space-y-4">
            <Skeleton height={60} />
            <Skeleton height={60} />
            <Skeleton height={60} />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Total Requests</p>
              <p className="text-xl font-bold text-white">{stats.total_requests.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Total Tokens</p>
              <p className="text-xl font-bold text-cyan-400">{stats.total_tokens.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Total Cost</p>
              <p className="text-xl font-bold text-emerald-400">${stats.total_cost.toFixed(4)}</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Actual Cost</p>
              <p className="text-xl font-bold text-purple-400">${stats.actual_cost.toFixed(4)}</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Unique Users</p>
              <p className="text-xl font-bold text-white">{stats.unique_users}</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Unique Models</p>
              <p className="text-xl font-bold text-white">{stats.unique_models}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Failed to load stats</p>
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
        title="Quick Usage Log Cleanup"
      >
        <div className="space-y-6">
          {/* Create new cleanup task */}
          <div className="p-4 bg-[#0A0A0C] rounded-lg">
            <h3 className="text-sm font-medium text-white mb-3">Delete Old Logs</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Delete logs before</label>
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
                  Delete
                </Button>
              </div>
            </div>
            <p className="text-xs text-amber-400 mt-2">
              Warning: This will permanently delete all usage logs before the selected date.
            </p>
          </div>

          {/* Cleanup result */}
          {cleanupResult && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <p className="text-sm text-emerald-400">
                Successfully deleted {cleanupResult.deleted_count.toLocaleString()} records
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
        title="Create Cleanup Task"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Delete logs before <span className="text-red-400">*</span>
            </label>
            <Input
              type="date"
              value={newTaskDate}
              onChange={(e) => setNewTaskDate(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              All usage logs before this date will be deleted
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setNewTaskDryRun(!newTaskDryRun)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                newTaskDryRun ? 'bg-blue-500' : 'bg-[#2A2A30]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  newTaskDryRun ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <div>
              <span className="text-sm text-gray-300">Dry Run</span>
              <p className="text-xs text-gray-500">
                Simulate the cleanup without actually deleting records
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
              Cancel
            </Button>
            <Button
              onClick={handleCreateTask}
              isLoading={createTaskLoading}
              disabled={!newTaskDate}
            >
              Create Task
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsagePage;
