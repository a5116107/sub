import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gift, History, CheckCircle, XCircle } from 'lucide-react';
import { userApi } from '../../api/user';
import type { RedeemHistory } from '../../types';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Table,
  Skeleton,
} from '../../components/ui';

interface RedeemResult {
  success: boolean;
  type: string;
  value: number;
  message: string;
}

const getTypeBadge = (type: string, t: (key: string) => string) => {
  switch (type.toLowerCase()) {
    case 'balance':
      return <Badge variant="success">{t('type.balance')}</Badge>;
    case 'subscription':
      return <Badge variant="primary">{t('type.subscription')}</Badge>;
    case 'quota':
      return <Badge variant="info">{t('type.quota')}</Badge>;
    default:
      return <Badge variant="default">{type}</Badge>;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const RedeemPage: React.FC = () => {
  const { t } = useTranslation('redeem');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [history, setHistory] = useState<RedeemHistory[]>([]);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await userApi.getRedeemHistory();
        setHistory(data);
      } catch (err) {
        console.error('Failed to fetch redeem history:', err);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const handleRedeem = async () => {
    if (!code.trim()) {
      setError(t('form.enterCode'));
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await userApi.redeemCode(code.trim());
      setResult(data);
      setCode('');

      // Refresh history after successful redemption
      if (data.success) {
        const updatedHistory = await userApi.getRedeemHistory();
        setHistory(updatedHistory);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to redeem code';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleRedeem();
    }
  };

  const columns = [
    {
      key: 'code',
      title: t('history.col.code'),
      render: (item: RedeemHistory) => (
        <span className="font-mono text-sm text-gray-300">{item.code}</span>
      ),
    },
    {
      key: 'type',
      title: t('history.col.type'),
      render: (item: RedeemHistory) => getTypeBadge(item.type, t),
    },
    {
      key: 'value',
      title: t('history.col.value'),
      render: (item: RedeemHistory) => (
        <span className="text-sm font-medium text-emerald-400">
          {item.type === 'balance' ? `$${item.value.toFixed(2)}` : item.value}
        </span>
      ),
    },
    {
      key: 'used_at',
      title: t('history.col.redeemedAt'),
      render: (item: RedeemHistory) => (
        <span className="text-sm text-gray-400">{formatDate(item.used_at)}</span>
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">{t('title')}</h1>
        <p className="text-gray-400">{t('subtitle')}</p>
      </div>

      {/* Redeem Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-cyan-400" />
            {t('form.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder={t('form.placeholder')}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError(null);
                    setResult(null);
                  }}
                  onKeyPress={handleKeyPress}
                  className="font-mono text-lg tracking-wider"
                  disabled={loading}
                />
              </div>
              <Button
                onClick={handleRedeem}
                disabled={loading || !code.trim()}
                isLoading={loading}
                className="px-8"
              >
                {loading ? t('form.redeeming') : t('form.redeem')}
              </Button>
            </div>

            {/* Result Message */}
            {result && (
              <div
                className={`flex items-center gap-3 p-4 rounded-lg ${
                  result.success
                    ? 'bg-emerald-500/10 border border-emerald-500/30'
                    : 'bg-red-500/10 border border-red-500/30'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      result.success ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {result.success ? t('result.success') : t('result.failed')}
                  </p>
                  <p className="text-sm text-gray-400">{result.message}</p>
                  {result.success && (
                    <p className="text-sm text-gray-300 mt-1">
                      {result.type === 'balance'
                        ? t('result.addedBalance', { value: result.value.toFixed(2) })
                        : t('result.activated', { type: result.type, value: result.value })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Help Text */}
            <p className="text-sm text-gray-500">
              {t('form.helpText')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Redemption History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" />
            {t('history.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {historyLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height={48} />
              ))}
            </div>
          ) : (
            <Table
              columns={columns}
              data={history}
              loading={historyLoading}
              emptyText={t('history.empty')}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RedeemPage;
