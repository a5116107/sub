import { api } from '../client';
import type { PaginatedResponse } from '../../types';

// ==================== Error Types ====================

export interface OpsError {
  id: number;
  type: string;
  message: string;
  stack_trace?: string;
  context?: Record<string, unknown>;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: number;
  created_at: string;
}

export interface RequestError {
  id: number;
  request_id: string;
  user_id: number;
  api_key_id: number;
  error_type: string;
  error_message: string;
  model: string;
  status_code: number;
  resolved: boolean;
  resolved_at?: string;
  created_at: string;
}

export interface UpstreamError {
  id: number;
  account_id: number;
  account_name?: string;
  platform: string;
  error_type: string;
  error_message: string;
  status_code: number;
  resolved: boolean;
  resolved_at?: string;
  created_at: string;
}

// ==================== Request Types ====================

export interface OpsRequest {
  id: number;
  request_id: string;
  user_id: number;
  api_key_id: number;
  account_id: number;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_cost: number;
  duration_ms: number;
  status_code: number;
  stream: boolean;
  user_agent?: string;
  ip_address?: string;
  created_at: string;
}

// ==================== Alert Types ====================

export interface AlertEvent {
  id: number;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source?: string;
  metadata?: Record<string, unknown>;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledged_at?: string;
  acknowledged_by?: number;
  resolved_at?: string;
  resolved_by?: number;
  created_at: string;
}

// ==================== Query Params ====================

export interface ErrorQueryParams {
  page?: number;
  page_size?: number;
  type?: string;
  resolved?: boolean;
  start_date?: string;
  end_date?: string;
}

export interface RequestErrorQueryParams {
  page?: number;
  page_size?: number;
  user_id?: number;
  error_type?: string;
  model?: string;
  resolved?: boolean;
  start_date?: string;
  end_date?: string;
}

export interface UpstreamErrorQueryParams {
  page?: number;
  page_size?: number;
  account_id?: number;
  platform?: string;
  error_type?: string;
  resolved?: boolean;
  start_date?: string;
  end_date?: string;
}

export interface RequestQueryParams {
  page?: number;
  page_size?: number;
  user_id?: number;
  api_key_id?: number;
  group_id?: number;
  account_id?: number;
  model?: string;
  kind?: string;
  platform?: string;
  request_id?: string;
  q?: string;
  sort?: string;
  status_code?: number;
  stream?: boolean;
  min_duration_ms?: number;
  max_duration_ms?: number;
  start_date?: string;
  end_date?: string;
}

export interface AlertEventQueryParams {
  page?: number;
  page_size?: number;
  type?: string;
  severity?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

// ==================== Alert Rule Types ====================

export interface AlertRule {
  id: number;
  name: string;
  description?: string;
  type: string;
  condition: string;
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAlertRuleRequest {
  name: string;
  description?: string;
  type: string;
  condition: string;
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled?: boolean;
}

// ==================== Alert Silence Types ====================

export interface AlertSilence {
  id: number;
  rule_id?: number;
  duration_minutes: number;
  reason?: string;
  created_by: number;
  created_at: string;
  expires_at: string;
}

export interface CreateAlertSilenceRequest {
  rule_id?: number;
  duration_minutes: number;
  reason?: string;
}

// ==================== Dashboard Types ====================

export interface OpsDashboardOverview {
  total_requests_24h: number;
  total_errors_24h: number;
  avg_latency_ms: number;
  active_accounts: number;
  qps: number;
  error_rate: number;
}

export interface ThroughputTrendPoint {
  timestamp: string;
  requests: number;
  tokens: number;
}

export interface LatencyHistogramPoint {
  bucket: string;
  count: number;
}

export interface ErrorTrendPoint {
  timestamp: string;
  count: number;
  type: string;
}

export interface ErrorDistributionPoint {
  type: string;
  count: number;
  percentage: number;
}

// ==================== Settings Types ====================

export interface AdvancedSettings {
  max_retries: number;
  retry_delay_ms: number;
  timeout_seconds: number;
  enable_circuit_breaker: boolean;
  circuit_breaker_threshold: number;
  circuit_breaker_timeout_ms: number;
}

export interface EmailNotificationConfig {
  enabled: boolean;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  from_address?: string;
  to_addresses?: string[];
}

export interface RuntimeAlertConfig {
  enabled: boolean;
  webhook_url?: string;
  alert_on_error_rate?: number;
  alert_on_latency_ms?: number;
}

export interface MetricThresholds {
  cpu_threshold: number;
  memory_threshold: number;
  disk_threshold: number;
  error_rate_threshold: number;
  latency_threshold_ms: number;
}

// ==================== API Client ====================

export const adminOpsApi = {
  // ==================== Errors ====================

  // Get all errors
  getErrors: (params?: ErrorQueryParams) =>
    api.get<PaginatedResponse<OpsError>>('/admin/ops/errors', { params }),

  // Get error by ID
  getError: (id: number) =>
    api.get<OpsError>(`/admin/ops/errors/${id}`),

  // Resolve error
  resolveError: (id: number) =>
    api.put<OpsError>(`/admin/ops/errors/${id}/resolve`, {}),

  // Retry error
  retryError: (id: number) =>
    api.post<{ success: boolean; message: string }>(`/admin/ops/errors/${id}/retry`, {}),

  // ==================== Request Errors ====================

  // Get all request errors
  getRequestErrors: (params?: RequestErrorQueryParams) =>
    api.get<PaginatedResponse<RequestError>>('/admin/ops/request-errors', { params }),

  // Get request error by ID
  getRequestError: (id: number) =>
    api.get<RequestError>(`/admin/ops/request-errors/${id}`),

  // Resolve request error
  resolveRequestError: (id: number) =>
    api.put<RequestError>(`/admin/ops/request-errors/${id}/resolve`, {}),

  // ==================== Upstream Errors ====================

  // Get all upstream errors
  getUpstreamErrors: (params?: UpstreamErrorQueryParams) =>
    api.get<PaginatedResponse<UpstreamError>>('/admin/ops/upstream-errors', { params }),

  // Get upstream error by ID
  getUpstreamError: (id: number) =>
    api.get<UpstreamError>(`/admin/ops/upstream-errors/${id}`),

  // Resolve upstream error
  resolveUpstreamError: (id: number) =>
    api.put<UpstreamError>(`/admin/ops/upstream-errors/${id}/resolve`, {}),

  // Retry upstream error
  retryUpstreamError: (id: number) =>
    api.post<{ success: boolean; message: string }>(`/admin/ops/upstream-errors/${id}/retry`, {}),

  // ==================== Requests ====================

  // Get all requests
  getRequests: (params?: RequestQueryParams) =>
    api.get<PaginatedResponse<OpsRequest>>('/admin/ops/requests', { params }),

  // Get request by request_id (backend does not expose /requests/:id)
  getRequest: async (requestId: string | number) => {
    const response = await api.get<PaginatedResponse<OpsRequest>>('/admin/ops/requests', {
      params: {
        request_id: requestId,
        page: 1,
        page_size: 1,
      },
    });
    const request = response.items?.[0];
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }
    return request;
  },

  // ==================== Alert Events ====================

  // Get all alert events
  getAlertEvents: (params?: AlertEventQueryParams) =>
    api.get<PaginatedResponse<AlertEvent>>('/admin/ops/alert-events', { params }),

  // Get alert event by ID
  getAlertEvent: (id: number) =>
    api.get<AlertEvent>(`/admin/ops/alert-events/${id}`),

  // Update alert event status
  updateAlertEventStatus: (id: number, status: 'acknowledged' | 'resolved') =>
    api.put<AlertEvent>(`/admin/ops/alert-events/${id}/status`, { status }),

  // ==================== Alert Rules ====================

  // Get all alert rules
  getAlertRules: () =>
    api.get<AlertRule[]>('/admin/ops/alert-rules'),

  // Create alert rule
  createAlertRule: (data: CreateAlertRuleRequest) =>
    api.post<AlertRule>('/admin/ops/alert-rules', data),

  // Update alert rule
  updateAlertRule: (id: number, data: Partial<CreateAlertRuleRequest>) =>
    api.put<AlertRule>(`/admin/ops/alert-rules/${id}`, data),

  // Delete alert rule
  deleteAlertRule: (id: number) =>
    api.delete<void>(`/admin/ops/alert-rules/${id}`),

  // ==================== Alert Silences ====================

  // Create alert silence
  createAlertSilence: (data: CreateAlertSilenceRequest) =>
    api.post<AlertSilence>('/admin/ops/alert-silences', data),

  // ==================== Monitoring Metrics ====================

  // Get concurrency metrics
  getConcurrency: () =>
    api.get<{
      current: number;
      limit: number;
      queued: number;
      active_requests: number;
    }>('/admin/ops/concurrency'),

  // Get account availability
  getAccountAvailability: () =>
    api.get<{
      total: number;
      available: number;
      unavailable: number;
      by_platform: Record<string, { available: number; total: number }>;
    }>('/admin/ops/account-availability'),

  // Get realtime traffic
  getRealtimeTraffic: () =>
    api.get<{
      qps: number;
      latency_ms: number;
      error_rate: number;
      active_requests: number;
    }>('/admin/ops/realtime-traffic'),

  // Get WebSocket QPS
  getWsQps: () =>
    api.get<{
      current: number;
      peak: number;
      connections: number;
    }>('/admin/ops/ws/qps'),

  // ==================== Dashboard ====================

  // Get dashboard overview
  getDashboardOverview: () =>
    api.get<OpsDashboardOverview>('/admin/ops/dashboard/overview'),

  // Get throughput trend
  getThroughputTrend: (params?: { hours?: number }) =>
    api.get<ThroughputTrendPoint[]>('/admin/ops/dashboard/throughput-trend', { params }),

  // Get latency histogram
  getLatencyHistogram: (params?: { hours?: number }) =>
    api.get<LatencyHistogramPoint[]>('/admin/ops/dashboard/latency-histogram', { params }),

  // Get error trend
  getErrorTrend: (params?: { hours?: number }) =>
    api.get<ErrorTrendPoint[]>('/admin/ops/dashboard/error-trend', { params }),

  // Get error distribution
  getErrorDistribution: (params?: { hours?: number }) =>
    api.get<ErrorDistributionPoint[]>('/admin/ops/dashboard/error-distribution', { params }),

  // ==================== Settings ====================

  // Get advanced settings
  getAdvancedSettings: () =>
    api.get<AdvancedSettings>('/admin/ops/advanced-settings'),

  // Update advanced settings
  updateAdvancedSettings: (data: Partial<AdvancedSettings>) =>
    api.put<AdvancedSettings>('/admin/ops/advanced-settings', data),

  // Get email notification config
  getEmailNotificationConfig: () =>
    api.get<EmailNotificationConfig>('/admin/ops/email-notification/config'),

  // Update email notification config
  updateEmailNotificationConfig: (data: Partial<EmailNotificationConfig>) =>
    api.put<EmailNotificationConfig>('/admin/ops/email-notification/config', data),

  // Get runtime alert config
  getRuntimeAlertConfig: () =>
    api.get<RuntimeAlertConfig>('/admin/ops/runtime/alert'),

  // Update runtime alert config
  updateRuntimeAlertConfig: (data: Partial<RuntimeAlertConfig>) =>
    api.put<RuntimeAlertConfig>('/admin/ops/runtime/alert', data),

  // Get metric thresholds
  getMetricThresholds: () =>
    api.get<MetricThresholds>('/admin/ops/settings/metric-thresholds'),

  // Update metric thresholds
  updateMetricThresholds: (data: Partial<MetricThresholds>) =>
    api.put<MetricThresholds>('/admin/ops/settings/metric-thresholds', data),

  // ==================== Error Management ====================

  // Get error retries
  getErrorRetries: (id: number) =>
    api.get<Array<{
      id: number;
      error_id: number;
      attempted_at: string;
      success: boolean;
      message?: string;
    }>>(`/admin/ops/errors/${id}/retries`),

  // Get upstream errors for request
  getRequestUpstreamErrors: (id: number) =>
    api.get<UpstreamError[]>(`/admin/ops/request-errors/${id}/upstream-errors`),

  // Retry client request error
  retryClientRequestError: (id: number) =>
    api.post<void>(`/admin/ops/request-errors/${id}/retry-client`, {}),

  // Retry specific upstream error by index
  retryUpstreamErrorByIndex: (id: number, idx: number) =>
    api.post<void>(`/admin/ops/request-errors/${id}/upstream-errors/${idx}/retry`, {}),
};
