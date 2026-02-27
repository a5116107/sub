import { api } from '../client';
import type { PaginatedResponse } from '../../types';

interface OpsErrorLog {
  id: number;
  level?: string;
  message?: string;
  error_message?: string;
  stack_trace?: string;
  created_at?: string;
}

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
  checkUpdates: (params?: { force?: boolean }) =>
    api.get<{
      has_update: boolean;
      latest_version?: string;
      release_notes?: string;
      download_url?: string;
    }>('/admin/system/check-updates', { params }),

  // System status (compat layer based on available endpoints)
  getStatus: async () => {
    await adminSystemApi.getVersion();
    return {
      status: 'running',
      uptime: 'unknown',
      memory_usage: {
        allocated: 0,
        total: 0,
        system: 0,
      },
      goroutines: 0,
      database_status: 'unknown',
      cache_status: 'unknown',
    };
  },

  // System metrics (compat layer based on ops realtime endpoint)
  getMetrics: async () => {
    const realtime = await api.get<Record<string, number>>('/admin/ops/realtime-traffic');
    return {
      cpu_usage: Number(realtime?.cpu_usage || 0),
      memory_usage: Number(realtime?.memory_usage || 0),
      disk_usage: Number(realtime?.disk_usage || 0),
      network_io: {
        bytes_in: Number(realtime?.bytes_in || 0),
        bytes_out: Number(realtime?.bytes_out || 0),
      },
    };
  },

  // Restart system
  restart: () =>
    api.post<void>('/admin/system/restart'),

  // Rollback to previous version
  rollback: () =>
    api.post<void>('/admin/system/rollback'),

  // Update system
  update: () =>
    api.post<void>('/admin/system/update'),

  // No dedicated backend endpoint (compat placeholder)
  getLogs: async () => [],

  // Use ops errors endpoint as system error source
  getErrorLogs: async (params?: { page?: number; page_size?: number }) => {
    const response = await api.get<PaginatedResponse<OpsErrorLog>>('/admin/ops/errors', { params });
    return {
      items: (response?.items || []).map((item) => ({
        id: item.id,
        level: item.level || 'error',
        message: item.message || item.error_message || '',
        stack_trace: item.stack_trace,
        created_at: item.created_at || '',
      })),
      total: response?.total || 0,
    };
  },

  // Resolve all unresolved ops errors (compat "clear")
  clearErrorLogs: async () => {
    const unresolved = await api.get<PaginatedResponse<OpsErrorLog>>('/admin/ops/errors', {
      params: { page: 1, page_size: 200, resolved: false },
    });
    await Promise.all(
      (unresolved?.items || []).map((item) =>
        api.put<void>(`/admin/ops/errors/${item.id}/resolve`, { resolved: true })),
    );
  },
};
