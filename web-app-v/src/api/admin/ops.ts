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
  account_id?: number;
  model?: string;
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

  // Get request by ID
  getRequest: (id: number) =>
    api.get<OpsRequest>(`/admin/ops/requests/${id}`),

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
};
