import React, { useEffect, useState, useCallback } from 'react';
import {
  Server,
  RefreshCw,
  RotateCcw,
  Power,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  GitCommit,
  Cpu,
  MemoryStick,
  HardDrive,
  Activity,
  Terminal,
  Trash2,
} from 'lucide-react';
import { adminSystemApi } from '../../api/admin/system';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
  Modal,
} from '../../components/ui';

interface SystemVersion {
  version: string;
  build_time: string;
  git_commit: string;
  go_version: string;
}

interface UpdateInfo {
  has_update: boolean;
  latest_version?: string;
  release_notes?: string;
  download_url?: string;
}

interface SystemStatus {
  status: string;
  uptime: string;
  memory_usage: {
    allocated: number;
    total: number;
    system: number;
  };
  goroutines: number;
  database_status: string;
  cache_status: string;
}

interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_io: {
    bytes_in: number;
    bytes_out: number;
  };
}

interface ErrorLog {
  id: number;
  level: string;
  message: string;
  stack_trace?: string;
  created_at: string;
}

export const SystemPage: React.FC = () => {
  // Data states
  const [version, setVersion] = useState<SystemVersion | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);

  // Modal states
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [showErrorLogsModal, setShowErrorLogsModal] = useState(false);
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [versionRes, statusRes, metricsRes] = await Promise.all([
        adminSystemApi.getVersion(),
        adminSystemApi.getStatus(),
        adminSystemApi.getMetrics(),
      ]);
      setVersion(versionRes);
      setStatus(statusRes);
      setMetrics(metricsRes);
    } catch (error) {
      console.error('Failed to fetch system data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckUpdates = async () => {
    setCheckingUpdate(true);
    try {
      const data = await adminSystemApi.checkUpdates();
      setUpdateInfo(data);
      if (data.has_update) {
        setShowUpdateModal(true);
      } else {
        setActionResult({ success: true, message: 'System is up to date!' });
      }
    } catch (error) {
      console.error('Failed to check updates:', error);
      setActionResult({ success: false, message: 'Failed to check for updates' });
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await adminSystemApi.update();
      setActionResult({ success: true, message: 'System update initiated. The service will restart shortly.' });
      setShowUpdateModal(false);
    } catch (error) {
      console.error('Failed to update:', error);
      setActionResult({ success: false, message: 'Failed to update system' });
    } finally {
      setUpdating(false);
    }
  };

  const handleRestart = async () => {
    setRestarting(true);
    try {
      await adminSystemApi.restart();
      setActionResult({ success: true, message: 'System restart initiated.' });
      setShowRestartModal(false);
    } catch (error) {
      console.error('Failed to restart:', error);
      setActionResult({ success: false, message: 'Failed to restart system' });
    } finally {
      setRestarting(false);
    }
  };

  const handleRollback = async () => {
    setRollingBack(true);
    try {
      await adminSystemApi.rollback();
      setActionResult({ success: true, message: 'System rollback initiated. The service will restart shortly.' });
      setShowRollbackModal(false);
    } catch (error) {
      console.error('Failed to rollback:', error);
      setActionResult({ success: false, message: 'Failed to rollback system' });
    } finally {
      setRollingBack(false);
    }
  };

  const handleViewErrorLogs = async () => {
    try {
      const data = await adminSystemApi.getErrorLogs({ page: 1, page_size: 50 });
      setErrorLogs(data.items);
      setShowErrorLogsModal(true);
    } catch (error) {
      console.error('Failed to fetch error logs:', error);
    }
  };

  const handleClearErrorLogs = async () => {
    setClearingLogs(true);
    try {
      await adminSystemApi.clearErrorLogs();
      setErrorLogs([]);
      setActionResult({ success: true, message: 'Error logs cleared successfully' });
    } catch (error) {
      console.error('Failed to clear error logs:', error);
      setActionResult({ success: false, message: 'Failed to clear error logs' });
    } finally {
      setClearingLogs(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (uptime: string) => {
    // Simple formatting for uptime string from backend
    return uptime;
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <Skeleton height={32} width={250} />
          <Skeleton height={20} width={300} className="mt-2" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton height={300} />
          <Skeleton height={300} />
          <Skeleton height={250} />
          <Skeleton height={250} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">System Management</h1>
          <p className="text-gray-400">Manage system updates, restarts, and monitor health</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleCheckUpdates}
            isLoading={checkingUpdate}
          >
            <Download className="w-4 h-4 mr-2" />
            Check Updates
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowRestartModal(true)}
          >
            <Power className="w-4 h-4 mr-2" />
            Restart
          </Button>
        </div>
      </div>

      {/* Action Result */}
      {actionResult && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          actionResult.success
            ? 'bg-emerald-500/10 border border-emerald-500/30'
            : 'bg-red-500/10 border border-red-500/30'
        }`}>
          {actionResult.success ? (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400" />
          )}
          <p className={actionResult.success ? 'text-emerald-400' : 'text-red-400'}>
            {actionResult.message}
          </p>
          <button
            onClick={() => setActionResult(null)}
            className="ml-auto text-gray-500 hover:text-white"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Version Info */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GitCommit className="w-5 h-5 text-cyan-400" />
              Version Information
            </CardTitle>
            {updateInfo?.has_update && (
              <Badge variant="warning">Update Available</Badge>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#0A0A0C] rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Current Version</p>
                  <p className="text-lg font-mono font-semibold text-white">
                    {version?.version || 'Unknown'}
                  </p>
                </div>
                <div className="p-3 bg-[#0A0A0C] rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Go Version</p>
                  <p className="text-lg font-mono font-semibold text-white">
                    {version?.go_version || 'Unknown'}
                  </p>
                </div>
              </div>
              <div className="p-3 bg-[#0A0A0C] rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Git Commit</p>
                <p className="text-sm font-mono text-gray-300 truncate">
                  {version?.git_commit || 'Unknown'}
                </p>
              </div>
              <div className="p-3 bg-[#0A0A0C] rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Build Time</p>
                <p className="text-sm text-gray-300">
                  {version?.build_time ? new Date(version.build_time).toLocaleString() : 'Unknown'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              System Status
            </CardTitle>
            <Badge variant={status?.status === 'healthy' ? 'success' : 'danger'}>
              {status?.status || 'Unknown'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#0A0A0C] rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Uptime</p>
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    {status?.uptime ? formatDuration(status.uptime) : 'Unknown'}
                  </p>
                </div>
                <div className="p-3 bg-[#0A0A0C] rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Goroutines</p>
                  <p className="text-sm font-semibold text-white">
                    {status?.goroutines?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#0A0A0C] rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Database</p>
                  <Badge
                    variant={status?.database_status === 'connected' ? 'success' : 'danger'}
                    className="text-xs"
                  >
                    {status?.database_status || 'Unknown'}
                  </Badge>
                </div>
                <div className="p-3 bg-[#0A0A0C] rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Cache</p>
                  <Badge
                    variant={status?.cache_status === 'connected' ? 'success' : 'danger'}
                    className="text-xs"
                  >
                    {status?.cache_status || 'Unknown'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-400" />
              System Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* CPU Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-gray-400">CPU Usage</span>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {metrics?.cpu_usage?.toFixed(1) || '0'}%
                  </span>
                </div>
                <div className="h-2 bg-[#2A2A30] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                    style={{ width: `${metrics?.cpu_usage || 0}%` }}
                  />
                </div>
              </div>

              {/* Memory Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MemoryStick className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-400">Memory Usage</span>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {metrics?.memory_usage?.toFixed(1) || '0'}%
                  </span>
                </div>
                <div className="h-2 bg-[#2A2A30] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all"
                    style={{ width: `${metrics?.memory_usage || 0}%` }}
                  />
                </div>
              </div>

              {/* Disk Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-gray-400">Disk Usage</span>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {metrics?.disk_usage?.toFixed(1) || '0'}%
                  </span>
                </div>
                <div className="h-2 bg-[#2A2A30] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
                    style={{ width: `${metrics?.disk_usage || 0}%` }}
                  />
                </div>
              </div>

              {/* Memory Details */}
              {status?.memory_usage && (
                <div className="mt-4 pt-4 border-t border-[#2A2A30]">
                  <p className="text-xs text-gray-500 mb-2">Memory Details</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-[#0A0A0C] rounded">
                      <p className="text-gray-500">Allocated</p>
                      <p className="text-white font-mono">
                        {formatBytes(status.memory_usage.allocated)}
                      </p>
                    </div>
                    <div className="p-2 bg-[#0A0A0C] rounded">
                      <p className="text-gray-500">Total</p>
                      <p className="text-white font-mono">
                        {formatBytes(status.memory_usage.total)}
                      </p>
                    </div>
                    <div className="p-2 bg-[#0A0A0C] rounded">
                      <p className="text-gray-500">System</p>
                      <p className="text-white font-mono">
                        {formatBytes(status.memory_usage.system)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5 text-red-400" />
              Maintenance Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 bg-[#0A0A0C] rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <RefreshCw className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Check for Updates</p>
                      <p className="text-xs text-gray-500">Verify if a new version is available</p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCheckUpdates}
                    isLoading={checkingUpdate}
                  >
                    Check
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-[#0A0A0C] rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <RotateCcw className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Rollback</p>
                      <p className="text-xs text-gray-500">Revert to previous version</p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowRollbackModal(true)}
                  >
                    Rollback
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-[#0A0A0C] rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Terminal className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Error Logs</p>
                      <p className="text-xs text-gray-500">View system error logs</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleViewErrorLogs}
                    >
                      View
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleClearErrorLogs}
                      isLoading={clearingLogs}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <Power className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Restart Service</p>
                      <p className="text-xs text-gray-500">Restart the entire application</p>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowRestartModal(true)}
                  >
                    Restart
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Update Modal */}
      <Modal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        title="System Update Available"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <Download className="w-6 h-6 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-400">
                New Version: {updateInfo?.latest_version}
              </p>
              <p className="text-xs text-gray-400">Current: {version?.version}</p>
            </div>
          </div>

          {updateInfo?.release_notes && (
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-sm text-gray-400 mb-2">Release Notes:</p>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">
                {updateInfo.release_notes}
              </p>
            </div>
          )}

          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-400">
              The system will restart automatically after the update. All active connections will be interrupted.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowUpdateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} isLoading={updating}>
              <Download className="w-4 h-4 mr-2" />
              Update Now
            </Button>
          </div>
        </div>
      </Modal>

      {/* Restart Modal */}
      <Modal
        isOpen={showRestartModal}
        onClose={() => setShowRestartModal(false)}
        title="Restart System"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-400">Warning</p>
              <p className="text-sm text-gray-400 mt-1">
                Restarting the system will interrupt all active connections and temporarily make the service unavailable.
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowRestartModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRestart} isLoading={restarting}>
              <Power className="w-4 h-4 mr-2" />
              Confirm Restart
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rollback Modal */}
      <Modal
        isOpen={showRollbackModal}
        onClose={() => setShowRollbackModal(false)}
        title="Rollback System"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-400">Warning</p>
              <p className="text-sm text-gray-400 mt-1">
                Rolling back will revert the system to the previous version.
                The service will restart and all active connections will be interrupted.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowRollbackModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRollback} isLoading={rollingBack}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Confirm Rollback
            </Button>
          </div>
        </div>
      </Modal>

      {/* Error Logs Modal */}
      <Modal
        isOpen={showErrorLogsModal}
        onClose={() => setShowErrorLogsModal(false)}
        title="Error Logs"
        size="lg"
      >
        <div className="space-y-4">
          {errorLogs.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <p className="text-gray-400">No error logs found</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {errorLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-[#0A0A0C] rounded-lg border border-[#2A2A30]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      variant={
                        log.level === 'error'
                          ? 'danger'
                          : log.level === 'warning'
                          ? 'warning'
                          : 'info'
                      }
                      className="text-xs"
                    >
                      {log.level.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">{log.message}</p>
                  {log.stack_trace && (
                    <pre className="mt-2 p-2 bg-[#121215] rounded text-xs text-gray-500 overflow-x-auto">
                      {log.stack_trace}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[#2A2A30]">
            <Button
              variant="danger"
              onClick={handleClearErrorLogs}
              isLoading={clearingLogs}
              disabled={errorLogs.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Logs
            </Button>
            <Button variant="secondary" onClick={() => setShowErrorLogsModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SystemPage;
