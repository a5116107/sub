import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  Plus,
  Eye,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Loader2,
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

const getStatusBadge = (status: string, t: (key: string) => string) => {
  switch (status.toLowerCase()) {
    case 'paid':
    case 'completed':
      return <Badge variant="success">{t('common:status.paid')}</Badge>;
    case 'pending':
      return <Badge variant="warning">{t('common:status.pending')}</Badge>;
    case 'failed':
    case 'cancelled':
      return <Badge variant="danger">{t('common:status.failed')}</Badge>;
    case 'expired':
      return <Badge variant="default">{t('common:status.expired')}</Badge>;
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
  const { t } = useTranslation('billing');
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [recentOrder, setRecentOrder] = useState<Order | null>(null);

  // Modal states
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pollingOrderId, setPollingOrderId] = useState<number | null>(null);
  const [pollingStatus, setPollingStatus] = useState<string | null>(null);

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // Payment order status polling
  useEffect(() => {
    if (!pollingOrderId) return;

    let pollCount = 0;
    const maxPolls = 100; // Auto-stop after 5 minutes (100 * 3s)

    const interval = setInterval(async () => {
      pollCount++;
      if (pollCount > maxPolls) {
        clearInterval(interval);
        setPollingOrderId(null);
        return;
      }

      try {
        const order = await paymentsApi.getOrder(pollingOrderId);
        const status = order.status.toLowerCase();

        if (status === 'paid' || status === 'completed') {
          clearInterval(interval);
          setRecentOrder(order);
          setPollingStatus(status);
          setPollingOrderId(null);
        } else if (status === 'failed' || status === 'expired' || status === 'cancelled') {
          clearInterval(interval);
          setRecentOrder(order);
          setPollingStatus(status);
          setPollingOrderId(null);
        }
      } catch (error) {
        console.error('Polling order status failed:', error);
      }
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [pollingOrderId]);

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

      // Store the created order locally
      setRecentOrder(response.order);
      setPollingOrderId(response.order.id);
      setPollingStatus(null);
      setShowRechargeModal(false);
      setRechargeAmount(10);
    } catch (error) {
      console.error('Failed to create order:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewOrder = (order: Order) => {
    setRecentOrder(order);
    setShowOrderDetailModal(true);
  };

  // Quick amount options
  const quickAmounts = [5, 10, 20, 50, 100];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{t('title')}</h1>
          <p className="text-gray-400">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setShowRechargeModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('recharge')}
        </Button>
      </div>

      {/* Payment Providers */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-cyan-400" />
            {t('paymentMethods')}
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : providers.length > 0 ? (
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
            <p className="text-gray-400 text-center py-4">{t('noProviders')}</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Order (shown after creating one) */}
      {recentOrder && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              {t('recentOrder')}
            </h2>
            <div className="flex items-center justify-between p-4 rounded-lg bg-[#1A1A1F] border border-[#2A2A30]">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-gray-400">{t('orderDetail.orderId')} #{recentOrder.order_no || recentOrder.id}</p>
                  <p className="text-lg font-medium text-emerald-400">{formatAmount(recentOrder.amount)}</p>
                  <p className="text-xs text-gray-500">{formatDate(recentOrder.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(recentOrder.status, t)}
                <button
                  onClick={() => handleViewOrder(recentOrder)}
                  className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
                  title={t('common:btn.view')}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Polling Indicator */}
      {pollingOrderId && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-3 py-4">
              {pollingStatus ? (
                <>
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                  <div className="text-center">
                    <p className="text-white font-medium">{t('polling.completed')}</p>
                    <p className="text-sm text-gray-400">{t('polling.status.' + pollingStatus)}</p>
                  </div>
                </>
              ) : (
                <>
                  <Loader2 className="w-6 h-6 text-[#00F0FF] animate-spin" />
                  <div className="text-center">
                    <p className="text-white font-medium">{t('polling.waiting')}</p>
                    <p className="text-sm text-gray-400">{t('polling.subtitle')}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">{t('infoTitle')}</p>
            <p className="text-sm text-gray-500 mt-1">{t('infoSubtitle')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Recharge Modal */}
      <Modal
        isOpen={showRechargeModal}
        onClose={() => {
          setShowRechargeModal(false);
          setRechargeAmount(10);
        }}
        title={t('rechargeModal.title')}
      >
        <div className="space-y-6">
          {/* Amount Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-3">{t('rechargeModal.selectAmount')}</label>
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
                placeholder={t('rechargeModal.customAmount')}
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(parseFloat(e.target.value) || 0)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-3">{t('rechargeModal.paymentMethod')}</label>
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
              <span className="text-gray-400">{t('rechargeModal.totalAmount')}</span>
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
              {t('common:btn.cancel')}
            </Button>
            <Button
              onClick={handleCreateOrder}
              isLoading={actionLoading}
              disabled={!selectedProvider || rechargeAmount <= 0}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('rechargeModal.proceed')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Order Detail Modal */}
      <Modal
        isOpen={showOrderDetailModal}
        onClose={() => {
          setShowOrderDetailModal(false);
        }}
        title={t('orderDetail.title')}
      >
        {recentOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">{t('orderDetail.orderId')}</p>
                <p className="text-white font-mono">#{recentOrder.order_no || recentOrder.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">{t('orderDetail.status')}</p>
                <div className="mt-1">{getStatusBadge(recentOrder.status, t)}</div>
              </div>
              <div>
                <p className="text-sm text-gray-400">{t('orderDetail.amount')}</p>
                <p className="text-emerald-400 font-medium">{formatAmount(recentOrder.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">{t('orderDetail.provider')}</p>
                <p className="text-white capitalize">{recentOrder.provider}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">{t('orderDetail.created')}</p>
                <p className="text-gray-300">{formatDate(recentOrder.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">{t('orderDetail.updated')}</p>
                <p className="text-gray-300">{formatDate(recentOrder.updated_at)}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#2A2A30]">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowOrderDetailModal(false);
                }}
              >
                {t('common:btn.close')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BillingPage;
