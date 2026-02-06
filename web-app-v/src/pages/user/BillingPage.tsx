import React, { useEffect, useState, useCallback } from 'react';
import {
  CreditCard,
  Plus,
  Eye,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { paymentsApi } from '../../api/payments';
import type { PaymentProvider, Order } from '../../types';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  Modal,
} from '../../components/ui';

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'paid':
    case 'completed':
      return <Badge variant="success">Paid</Badge>;
    case 'pending':
      return <Badge variant="warning">Pending</Badge>;
    case 'failed':
    case 'cancelled':
      return <Badge variant="danger">Failed</Badge>;
    case 'expired':
      return <Badge variant="default">Expired</Badge>;
    default:
      return <Badge variant="info">{status}</Badge>;
  }
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const BillingPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Modal states
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Recharge form state
  const [rechargeAmount, setRechargeAmount] = useState<number>(10);
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  const fetchProviders = useCallback(async () => {
    try {
      const response = await paymentsApi.getProviders();
      setProviders(response);
      if (response.length > 0) {
        setSelectedProvider(response[0].type);
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await paymentsApi.getOrders();
      setOrders(response);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
    fetchOrders();
  }, [fetchProviders, fetchOrders]);

  const handleCreateOrder = async () => {
    if (!selectedProvider || rechargeAmount <= 0) return;

    setActionLoading(true);
    try {
      const response = await paymentsApi.createOrder({
        amount: rechargeAmount,
        provider: selectedProvider,
        return_url: window.location.href,
      });

      // If there's a payment URL, redirect to it
      if (response.payment_url) {
        window.open(response.payment_url, '_blank');
      }

      setShowRechargeModal(false);
      setRechargeAmount(10);
      fetchOrders();
    } catch (error) {
      console.error('Failed to create order:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetailModal(true);
  };

  const handleRefreshOrderStatus = async (orderId: number) => {
    setActionLoading(true);
    try {
      const response = await paymentsApi.getOrderStatus(orderId);
      // Update the order in the list
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: response.status } : o
        )
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, status: response.status } : null
        );
      }
    } catch (error) {
      console.error('Failed to refresh order status:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(orders.length / pageSize);
  const paginatedOrders = orders.slice((page - 1) * pageSize, page * pageSize);

  // Quick amount options
  const quickAmounts = [5, 10, 20, 50, 100];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Billing</h1>
          <p className="text-gray-400">Manage your balance and payment history</p>
        </div>
        <Button onClick={() => setShowRechargeModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Recharge
        </Button>
      </div>

      {/* Payment Providers */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-cyan-400" />
            Payment Methods
          </h2>
          {providers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    provider.status === 'active'
                      ? 'bg-[#1A1A1F] border-[#2A2A30] hover:border-[#00F0FF]/50'
                      : 'bg-[#1A1A1F]/50 border-[#2A2A30]/50 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{provider.name}</p>
                      <p className="text-sm text-gray-500 capitalize">{provider.type}</p>
                    </div>
                    {provider.status === 'active' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">No payment methods available</p>
          )}
        </CardContent>
      </Card>

      {/* Order History */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Payment History
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : orders.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2A2A30]">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Order ID</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Provider</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-[#2A2A30]/50 hover:bg-[#1A1A1F]/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className="text-sm text-cyan-400 font-mono">#{order.id}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-emerald-400 font-medium">
                            {formatAmount(order.amount)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-300 capitalize">{order.provider}</span>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-400">{formatDate(order.created_at)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleViewOrder(order)}
                              className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {order.status === 'pending' && (
                              <button
                                onClick={() => handleRefreshOrderStatus(order.id)}
                                className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-cyan-400 transition-colors"
                                title="Refresh Status"
                                disabled={actionLoading}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2A2A30]">
                  <p className="text-sm text-gray-400">
                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, orders.length)} of{' '}
                    {orders.length} orders
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
            </>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No payment history yet</p>
              <p className="text-sm text-gray-500 mt-1">Your recharge history will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recharge Modal */}
      <Modal
        isOpen={showRechargeModal}
        onClose={() => {
          setShowRechargeModal(false);
          setRechargeAmount(10);
        }}
        title="Recharge Balance"
      >
        <div className="space-y-6">
          {/* Amount Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-3">Select Amount</label>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setRechargeAmount(amount)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    rechargeAmount === amount
                      ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/50'
                      : 'bg-[#1A1A1F] text-gray-400 border border-[#2A2A30] hover:border-[#3A3A40]'
                  }`}
                >
                  ${amount}
                </button>
              ))}
            </div>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="Custom amount"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(parseFloat(e.target.value) || 0)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-3">Payment Method</label>
            <div className="space-y-2">
              {providers
                .filter((p) => p.status === 'active')
                .map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => setSelectedProvider(provider.type)}
                    className={`w-full p-4 rounded-lg text-left transition-colors ${
                      selectedProvider === provider.type
                        ? 'bg-[#00F0FF]/10 border border-[#00F0FF]/50'
                        : 'bg-[#1A1A1F] border border-[#2A2A30] hover:border-[#3A3A40]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{provider.name}</p>
                        <p className="text-sm text-gray-500 capitalize">{provider.type}</p>
                      </div>
                      {selectedProvider === provider.type && (
                        <CheckCircle className="w-5 h-5 text-[#00F0FF]" />
                      )}
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-[#0A0A0C] border border-[#2A2A30] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Amount</span>
              <span className="text-2xl font-bold text-emerald-400">
                {formatAmount(rechargeAmount)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowRechargeModal(false);
                setRechargeAmount(10);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrder}
              isLoading={actionLoading}
              disabled={!selectedProvider || rechargeAmount <= 0}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Proceed to Payment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Order Detail Modal */}
      <Modal
        isOpen={showOrderDetailModal}
        onClose={() => {
          setShowOrderDetailModal(false);
          setSelectedOrder(null);
        }}
        title="Order Details"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Order ID</p>
                <p className="text-white font-mono">#{selectedOrder.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
              </div>
              <div>
                <p className="text-sm text-gray-400">Amount</p>
                <p className="text-emerald-400 font-medium">{formatAmount(selectedOrder.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Provider</p>
                <p className="text-white capitalize">{selectedOrder.provider}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Created</p>
                <p className="text-gray-300">{formatDate(selectedOrder.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Updated</p>
                <p className="text-gray-300">{formatDate(selectedOrder.updated_at)}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#2A2A30]">
              {selectedOrder.status === 'pending' && (
                <Button
                  variant="secondary"
                  onClick={() => handleRefreshOrderStatus(selectedOrder.id)}
                  isLoading={actionLoading}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Status
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  setShowOrderDetailModal(false);
                  setSelectedOrder(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BillingPage;
