import { api } from './client';
import type {
  PaymentProvider,
  Order,
  CreateOrderRequest,
} from '../types';

export const paymentsApi = {
  // Get payment providers (response is wrapped: { providers: [...] })
  getProviders: () =>
    api.get<{ providers: PaymentProvider[] }>('/payments/providers')
      .then(res => res.providers || []),

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
};
