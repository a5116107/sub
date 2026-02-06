import React, { useEffect, useState } from 'react';
import { CreditCard, Calendar, TrendingUp, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { subscriptionsApi } from '../../api/subscriptions';
import type { UserSubscription, Group } from '../../types';
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
  group?: Group;
}

const ProgressBar: React.FC<{
  label: string;
  used: number;
  limit: number;
  color?: string;
}> = ({ label, used, limit, color = '#00F0FF' }) => {
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
        {percentage.toFixed(1)}% used
      </div>
    </div>
  );
};

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return <Badge variant="success">Active</Badge>;
    case 'expired':
      return <Badge variant="danger">Expired</Badge>;
    case 'cancelled':
      return <Badge variant="default">Cancelled</Badge>;
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
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<ExpandedSubscription[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const data = await subscriptionsApi.getSubscriptions();
        setSubscriptions(data);
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

  const stats = [
    {
      label: 'Active Subscriptions',
      value: activeSubscriptions.length.toString(),
      icon: CreditCard,
      color: 'text-emerald-400',
    },
    {
      label: 'Total Subscriptions',
      value: subscriptions.length.toString(),
      icon: TrendingUp,
      color: 'text-blue-400',
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Subscriptions</h1>
        <p className="text-gray-400">Manage your subscription plans and usage limits</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-[#0A0A0C] ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  {loading ? (
                    <Skeleton width={40} height={24} />
                  ) : (
                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Subscriptions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Active Subscriptions</h2>
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
              <p className="text-gray-400 mb-2">No active subscriptions</p>
              <p className="text-sm text-gray-500">
                Contact support or redeem a subscription code to get started
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
                                Expires: {formatDate(sub.expires_at)}
                              </span>
                              {isExpiringSoon && (
                                <span className="text-amber-400">
                                  ({daysRemaining} days remaining)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {getStatusBadge(sub.status)}
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
                          <p className="text-xs text-gray-500 mb-1">Daily</p>
                          <p className="text-sm font-medium text-white">
                            ${sub.daily_usage_usd.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-[#0A0A0C] rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Weekly</p>
                          <p className="text-sm font-medium text-white">
                            ${sub.weekly_usage_usd.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-[#0A0A0C] rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Monthly</p>
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
                                label="Daily Usage"
                                used={sub.progress.daily_usage}
                                limit={sub.progress.daily_limit}
                                color="#00F0FF"
                              />
                              <ProgressBar
                                label="Weekly Usage"
                                used={sub.progress.weekly_usage}
                                limit={sub.progress.weekly_limit}
                                color="#7000FF"
                              />
                              <ProgressBar
                                label="Monthly Usage"
                                used={sub.progress.monthly_usage}
                                limit={sub.progress.monthly_limit}
                                color="#FF0055"
                              />
                            </>
                          ) : (
                            <div className="space-y-4">
                              <ProgressBar
                                label="Daily Usage"
                                used={sub.daily_usage_usd}
                                limit={sub.group?.daily_limit_usd || 10}
                              />
                              <ProgressBar
                                label="Weekly Usage"
                                used={sub.weekly_usage_usd}
                                limit={sub.group?.weekly_limit_usd || 50}
                              />
                              <ProgressBar
                                label="Monthly Usage"
                                used={sub.monthly_usage_usd}
                                limit={sub.group?.monthly_limit_usd || 200}
                              />
                            </div>
                          )}

                          {/* Subscription Details */}
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#2A2A30]">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Started</p>
                              <p className="text-sm text-white">{formatDate(sub.starts_at)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Expires</p>
                              <p className="text-sm text-white">{formatDate(sub.expires_at)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Platform</p>
                              <p className="text-sm text-white">
                                {sub.group?.platform || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Rate Multiplier</p>
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
          <h2 className="text-lg font-semibold text-white mb-4">Past Subscriptions</h2>
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
                    {getStatusBadge(sub.status)}
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
