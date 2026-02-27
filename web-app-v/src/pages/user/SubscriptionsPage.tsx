import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Calendar, TrendingUp, AlertCircle, ChevronDown, ChevronUp, Clock, DollarSign } from 'lucide-react';
import { subscriptionsApi } from '../../api/subscriptions';
import type { UserSubscription, SubscriptionSummary } from '../../types';
import {
  Card,
  CardContent,
  Badge,
  Skeleton,
} from '../../components/ui';

interface SubscriptionProgress {
  subscription: UserSubscription;
  daily_usage: number;
  daily_limit: number;
  weekly_usage: number;
  weekly_limit: number;
  monthly_usage: number;
  monthly_limit: number;
}

interface ExpandedSubscription extends UserSubscription {
  progress?: SubscriptionProgress;
}

const ProgressBar: React.FC<{
  label: string;
  used: number;
  limit: number;
  color?: string;
  usedText: string;
}> = ({ label, used, limit, color = '#00F0FF', usedText }) => {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isWarning = percentage >= 80;
  const isDanger = percentage >= 95;

  const barColor = isDanger ? '#EF4444' : isWarning ? '#F59E0B' : color;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-300">
          ${used.toFixed(2)} / ${limit.toFixed(2)}
        </span>
      </div>
      <div className="h-2 bg-[#0A0A0C] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
      <div className="text-xs text-gray-500 text-right">
        {usedText}
      </div>
    </div>
  );
};

const getStatusBadge = (status: string, t: (key: string) => string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return <Badge variant="success">{t('summary.active')}</Badge>;
    case 'expired':
      return <Badge variant="danger">{t('summary.expired')}</Badge>;
    case 'cancelled':
      return <Badge variant="default">{t('common:status.cancelled')}</Badge>;
    default:
      return <Badge variant="info">{status}</Badge>;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getDaysRemaining = (expiresAt: string) => {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
};

export const SubscriptionsPage: React.FC = () => {
  const { t } = useTranslation('subs');
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<ExpandedSubscription[]>([]);
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const [data, summaryData] = await Promise.all([
          subscriptionsApi.getSubscriptions().catch(() => []),
          subscriptionsApi.getSummary().catch(() => null),
        ]);
        setSubscriptions(Array.isArray(data) ? data : []);
        setSummary(summaryData);
      } catch (error) {
        console.error('Failed to fetch subscriptions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const toggleExpand = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);

    // Load progress if not already loaded
    const sub = subscriptions.find((s) => s.id === id);
    if (sub && !sub.progress) {
      setLoadingProgress(id);
      try {
        const progress = await subscriptionsApi.getProgress(id);
        setSubscriptions((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, progress } : s
          )
        );
      } catch (error) {
        console.error('Failed to fetch progress:', error);
      } finally {
        setLoadingProgress(null);
      }
    }
  };

  const activeSubscriptions = subscriptions.filter(
    (s) => s.status.toLowerCase() === 'active'
  );
  const expiredSubscriptions = subscriptions.filter(
    (s) => s.status.toLowerCase() !== 'active'
  );

  const summaryCards = [
    {
      label: t('summary.active'),
      value: summary?.active_count?.toString() || activeSubscriptions.length.toString(),
      icon: CreditCard,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: t('summary.expired'),
      value: expiredSubscriptions.length.toString(),
      icon: Clock,
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
    },
    {
      label: t('summary.totalUsed'),
      value: summary ? `$${(summary.total_used_usd ?? 0).toFixed(2)}` : '$0.00',
      icon: DollarSign,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: t('summary.subscriptions'),
      value: (summary?.subscriptions?.length ?? subscriptions.length).toString(),
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">{t('title')}</h1>
        <p className="text-gray-400">{t('subtitle')}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card, index) => (
          <Card key={index}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bgColor} ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500">{card.label}</p>
                  {loading ? (
                    <Skeleton width={60} height={24} />
                  ) : (
                    <p className={`text-xl font-bold ${card.color}`}>
                      {card.value}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Subscriptions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">{t('active.title')}</h2>
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton height={100} />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : activeSubscriptions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">{t('active.empty')}</p>
              <p className="text-sm text-gray-500">
                {t('active.emptyDesc')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeSubscriptions.map((sub) => {
              const daysRemaining = getDaysRemaining(sub.expires_at);
              const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;
              const isExpanded = expandedId === sub.id;

              return (
                <Card key={sub.id} className={isExpiringSoon ? 'border-amber-500/50' : ''}>
                  <CardContent className="p-0">
                    {/* Main Info */}
                    <div
                      className="p-6 cursor-pointer hover:bg-[#1a1a1d] transition-colors"
                      onClick={() => toggleExpand(sub.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                            <CreditCard className="w-6 h-6 text-cyan-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">
                              {sub.group?.name || `Group #${sub.group_id}`}
                            </h3>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {t('active.expires', { date: formatDate(sub.expires_at) })}
                              </span>
                              {isExpiringSoon && (
                                <span className="text-amber-400">
                                  {t('active.daysRemaining', { days: daysRemaining })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {getStatusBadge(sub.status, t)}
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Quick Usage Summary */}
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="text-center p-3 bg-[#0A0A0C] rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">{t('active.daily')}</p>
                          <p className="text-sm font-medium text-white">
                            ${sub.daily_usage_usd.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-[#0A0A0C] rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">{t('active.weekly')}</p>
                          <p className="text-sm font-medium text-white">
                            ${sub.weekly_usage_usd.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-[#0A0A0C] rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">{t('active.monthly')}</p>
                          <p className="text-sm font-medium text-white">
                            ${sub.monthly_usage_usd.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-6 pb-6 border-t border-[#2A2A30]">
                        <div className="pt-6 space-y-6">
                          {loadingProgress === sub.id ? (
                            <div className="space-y-4">
                              <Skeleton height={60} />
                              <Skeleton height={60} />
                              <Skeleton height={60} />
                            </div>
                          ) : sub.progress ? (
                            <>
                              <ProgressBar
                                label={t('active.dailyUsage')}
                                used={sub.progress.daily_usage}
                                limit={sub.progress.daily_limit}
                                color="#00F0FF"
                                usedText={t('active.used', { percent: Math.round(sub.progress.daily_limit > 0 ? (sub.progress.daily_usage / sub.progress.daily_limit) * 100 : 0) })}
                              />
                              <ProgressBar
                                label={t('active.weeklyUsage')}
                                used={sub.progress.weekly_usage}
                                limit={sub.progress.weekly_limit}
                                color="#7000FF"
                                usedText={t('active.used', { percent: Math.round(sub.progress.weekly_limit > 0 ? (sub.progress.weekly_usage / sub.progress.weekly_limit) * 100 : 0) })}
                              />
                              <ProgressBar
                                label={t('active.monthlyUsage')}
                                used={sub.progress.monthly_usage}
                                limit={sub.progress.monthly_limit}
                                color="#FF0055"
                                usedText={t('active.used', { percent: Math.round(sub.progress.monthly_limit > 0 ? (sub.progress.monthly_usage / sub.progress.monthly_limit) * 100 : 0) })}
                              />
                            </>
                          ) : (
                            <div className="space-y-4">
                              <ProgressBar
                                label={t('active.dailyUsage')}
                                used={sub.daily_usage_usd}
                                limit={sub.group?.daily_limit_usd || 10}
                                usedText={t('active.used', { percent: Math.round((sub.group?.daily_limit_usd || 10) > 0 ? (sub.daily_usage_usd / (sub.group?.daily_limit_usd || 10)) * 100 : 0) })}
                              />
                              <ProgressBar
                                label={t('active.weeklyUsage')}
                                used={sub.weekly_usage_usd}
                                limit={sub.group?.weekly_limit_usd || 50}
                                usedText={t('active.used', { percent: Math.round((sub.group?.weekly_limit_usd || 50) > 0 ? (sub.weekly_usage_usd / (sub.group?.weekly_limit_usd || 50)) * 100 : 0) })}
                              />
                              <ProgressBar
                                label={t('active.monthlyUsage')}
                                used={sub.monthly_usage_usd}
                                limit={sub.group?.monthly_limit_usd || 200}
                                usedText={t('active.used', { percent: Math.round((sub.group?.monthly_limit_usd || 200) > 0 ? (sub.monthly_usage_usd / (sub.group?.monthly_limit_usd || 200)) * 100 : 0) })}
                              />
                            </div>
                          )}

                          {/* Subscription Details */}
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#2A2A30]">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">{t('active.started')}</p>
                              <p className="text-sm text-white">{formatDate(sub.starts_at)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">{t('active.expiresLabel')}</p>
                              <p className="text-sm text-white">{formatDate(sub.expires_at)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">{t('active.platform')}</p>
                              <p className="text-sm text-white">
                                {sub.group?.platform || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">{t('active.rateMultiplier')}</p>
                              <p className="text-sm text-white">
                                {sub.group?.rate_multiplier || 1}x
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Expired/Cancelled Subscriptions */}
      {expiredSubscriptions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">{t('past.title')}</h2>
          <div className="space-y-4">
            {expiredSubscriptions.map((sub) => (
              <Card key={sub.id} className="opacity-60">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-[#1a1a1d]">
                        <CreditCard className="w-6 h-6 text-gray-500" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-300">
                          {sub.group?.name || `Group #${sub.group_id}`}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(sub.starts_at)} - {formatDate(sub.expires_at)}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(sub.status, t)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsPage;
