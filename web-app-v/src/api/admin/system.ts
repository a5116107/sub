import { api } from '../client';

export const adminSystemApi = {
  // Get system version
  getVersion: () =>
    api.get<{
      version: string;
      build_time: string;
      git_commit: string;
      go_version: string;
    }>('/admin/system/version'),

  // Check for updates
  checkUpdates: () =>
    api.get<{
      has_update: boolean;
      latest_version?: string;
      release_notes?: string;
      download_url?: string;
    }>('/admin/system/updates'),

  // Get system status
  getStatus: () =>
    api.get<{
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
    }>('/admin/system/status'),

  // Get system metrics
  getMetrics: () =>
    api.get<{
      cpu_usage: number;
      memory_usage: number;
      disk_usage: number;
      network_io: {
        bytes_in: number;
        bytes_out: number;
      };
    }>('/admin/system/metrics'),

  // Restart system
  restart: () =>
    api.post<void>('/admin/system/restart', {}),

  // Rollback to previous version
  rollback: () =>
    api.post<void>('/admin/system/rollback', {}),

  // Update system
  update: () =>
    api.post<void>('/admin/system/update', {}),

  // Get system logs
  getLogs: (params?: { lines?: number; level?: string }) =>
    api.get<string[]>('/admin/system/logs', { params }),

  // Get error logs
  getErrorLogs: (params?: { page?: number; page_size?: number }) =>
    api.get<{
      items: Array<{
        id: number;
        level: string;
        message: string;
        stack_trace?: string;
        created_at: string;
      }>;
      total: number;
    }>('/admin/system/errors', { params }),

  // Clear error logs
  clearErrorLogs: () =>
    api.delete<void>('/admin/system/errors'),
};
