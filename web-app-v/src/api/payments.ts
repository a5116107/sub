import { api } from './client';
import type {
  PaymentProvider,
  Order,
  CreateOrderRequest,
} from '../types';

export const paymentsApi = {
  // Get payment providers
  getProviders: () =>
    api.get<PaymentProvider[]>('/payments/providers'),

  // Create order
  createOrder: (data: CreateOrderRequest) =>
    api.post<{
      order: Order;
      payment_url?: string;
      payment_data?: Record<string, unknown>;
    }>('/payments/orders', data),

  // Get order details
  getOrder: (id: number) =>
    api.get<Order>(`/payments/orders/${id}`),

  // Get order status
  getOrderStatus: (id: number) =>
    api.get<{ status: string; paid_at?: string }>(`/payments/orders/${id}/status`),

  // Get user orders
  getOrders: () =>
    api.get<Order[]>('/payments/orders'),
};
