import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Users,
  Database,
  Activity,
  TrendingUp,
  ArrowRight,
  Server,
  AlertCircle,
  CheckCircle,
  Clock,
  Key,
  Zap,
  Download,
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
  Button,
  Modal,
  Input,
} from '../../components/ui';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

interface AdminStats {
  total_users: number;
  total_accounts: number;
  total_requests_today: number;
  total_cost_today: number;
  active_subscriptions: number;
  system_status: string;
}

interface TrendData {
  date: string;
  requests: number;
  cost: number;
  new_users: number;
}

interface RealtimeMetrics {
  current_qps: number;
  current_latency_ms: number;
  active_requests: number;
  error_rate: number;
}

interface UsersTrendData {
  timestamp: string;
  total_users: number;
  new_users: number;
  active_users: number;
}

interface ApiKeysTrendData {
  timestamp: string;
  total_keys: number;
  new_keys: number;
  active_keys: number;
}

interface ModelStat {
  model: string;
  requests: number;
  tokens: number;
  cost: number;
}

interface UserUsageStat {
  user_id: number;
  username: string;
  total_requests: number;
  total_cost: number;
  total_tokens: number;
}

interface ApiKeyUsageStat {
  api_key_id: number;
  api_key_name: string;
  user_id: number;
  total_requests: number;
  total_cost: number;
  total_tokens: number;
}

const PIE_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
const CHART_AXIS_COLOR = 'var(--text-muted)';
const CHART_GRID_COLOR = 'var(--grid-line)';
const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
};
const CHART_TOOLTIP_LABEL_STYLE = { color: 'var(--text-primary)' };

export const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation('admin');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null);
  const [usersTrend, setUsersTrend] = useState<UsersTrendData[]>([]);
  const [apiKeysTrend, setApiKeysTrend] = useState<ApiKeysTrendData[]>([]);
  const [modelStats, setModelStats] = useState<ModelStat[]>([]);
  const [topUsers, setTopUsers] = useState<UserUsageStat[]>([]);
  const [topApiKeys, setTopApiKeys] = useState<ApiKeyUsageStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRealtime, setLoadingRealtime] = useState(false);
  const [showBackfillModal, setShowBackfillModal] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{ backfilled_count: number } | null>(null);
  const [backfillParams, setBackfillParams] = useState<{
    granularity?: string;
    model?: string;
    user_id?: string;
    group_id?: string;
    account_id?: string;
  }>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, trendsRes, usersTrendRes, apiKeysTrendRes, modelsRes, usersUsageRes, apiKeysUsageRes] = await Promise.all([
          adminApi.getDashboardStats(),
          adminApi.getDashboardTrends({ days: 7 }),
          adminApi.getUsersTrend({ granularity: 'day', limit: 7 }),
          adminApi.getApiKeysTrend({ granularity: 'day', limit: 7 }),
          adminApi.getDashboardModels({ limit: 6 }).catch(() => []),
          adminApi.getBatchUsersUsage({}).catch(() => []),
          adminApi.getBatchApiKeysUsage({}).catch(() => []),
        ]);
        setStats(statsRes);
        setTrends(Array.isArray(trendsRes) ? trendsRes : []);
        setUsersTrend(Array.isArray(usersTrendRes) ? usersTrendRes : []);
        setApiKeysTrend(Array.isArray(apiKeysTrendRes) ? apiKeysTrendRes : []);
        setModelStats(Array.isArray(modelsRes) ? modelsRes : []);
        const usersArr = Array.isArray(usersUsageRes) ? usersUsageRes : [];
        setTopUsers(usersArr.sort((a: UserUsageStat, b: UserUsageStat) => b.total_cost - a.total_cost).slice(0, 5));
        const keysArr = Array.isArray(apiKeysUsageRes) ? apiKeysUsageRes : [];
        setTopApiKeys(keysArr.sort((a: ApiKeyUsageStat, b: ApiKeyUsageStat) => b.total_cost - a.total_cost).slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch admin dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchRealtimeMetrics = async () => {
    setLoadingRealtime(true);
    try {
      const data = await adminApi.getDashboardRealtime();
      setRealtimeMetrics(data);
    } catch (error) {
      console.error('Failed to fetch realtime metrics:', error);
    } finally {
      setLoadingRealtime(false);
    }
  };

  const handleBackfill = async () => {
    setBackfillLoading(true);
    setBackfillResult(null);
    try {
      const params: Record<string, unknown> = {};
      if (backfillParams.granularity) params.granularity = backfillParams.granularity;
      if (backfillParams.model) params.model = backfillParams.model;
      if (backfillParams.user_id) params.user_id = parseInt(backfillParams.user_id);
      if (backfillParams.group_id) params.group_id = parseInt(backfillParams.group_id);
      if (backfillParams.account_id) params.account_id = parseInt(backfillParams.account_id);
      const result = await adminApi.backfillAggregation(params);
      setBackfillResult(result);
    } catch (error) {
      console.error('Failed to backfill:', error);
    } finally {
      setBackfillLoading(false);
    }
  };

  useEffect(() => {
    fetchRealtimeMetrics();
    // Refresh realtime metrics every 30 seconds
    const interval = setInterval(fetchRealtimeMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    {
      title: t('dashboard.stat.totalUsers'),
      value: stats?.total_users?.toLocaleString() || '0',
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      link: '/admin/users',
    },
    {
      title: t('dashboard.stat.totalAccounts'),
      value: stats?.total_accounts?.toLocaleString() || '0',
      icon: Database,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      link: '/admin/accounts',
    },
    {
      title: t('dashboard.stat.todaysRequests'),
      value: stats?.total_requests_today?.toLocaleString() || '0',
      icon: Activity,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      link: '/admin/usage',
    },
    {
      title: t('dashboard.stat.todaysCost'),
      value: `$${(stats?.total_cost_today ?? 0).toFixed(4)}`,
      icon: TrendingUp,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      link: '/admin/usage',
    },
    {
      title: t('dashboard.stat.activeSubscriptions'),
      value: stats?.active_subscriptions?.toLocaleString() || '0',
      icon: Server,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      link: '/admin/subscriptions',
    },
    {
      title: t('dashboard.stat.systemStatus'),
      value: stats?.system_status || 'Unknown',
      icon: stats?.system_status === 'healthy' ? CheckCircle : AlertCircle,
      color: stats?.system_status === 'healthy' ? 'text-green-400' : 'text-red-400',
      bgColor: stats?.system_status === 'healthy' ? 'bg-green-500/10' : 'bg-red-500/10',
      isStatus: true,
    },
  ];

  const realtimeCards = [
    {
      title: t('dashboard.realtime.currentQps'),
      value: (realtimeMetrics?.current_qps ?? 0).toFixed(2),
      icon: Zap,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: t('dashboard.realtime.avgLatency'),
      value: `${(realtimeMetrics?.current_latency_ms ?? 0).toFixed(0)} ms`,
      icon: Clock,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
    },
    {
      title: t('dashboard.realtime.activeRequests'),
      value: (realtimeMetrics?.active_requests ?? 0).toString(),
      icon: Activity,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
    },
    {
      title: t('dashboard.realtime.errorRate'),
      value: `${(realtimeMetrics?.error_rate ?? 0).toFixed(2)}%`,
      icon: AlertCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)] mb-2">
            {t('dashboard.title')}
          </h1>
          <p className="text-[var(--text-secondary)]">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setShowBackfillModal(true)}>
          <Download className="w-4 h-4 mr-2" />
          {t('dashboard.backfill')}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map((stat, index) => (
          <Link
            key={index}
            to={stat.link || '#'}
            className={stat.link ? '' : 'pointer-events-none'}
          >
            <Card className="h-full hover:border-red-500/30 transition-colors group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-muted)] mb-1">{stat.title}</p>
                    {loading ? (
                      <Skeleton width={80} height={28} />
                    ) : stat.isStatus ? (
                      <Badge
                        variant={
                          stat.value === 'healthy' ? 'success' : 'danger'
                        }
                      >
                        {stat.value}
                      </Badge>
                    ) : (
                      <p className="text-2xl font-bold text-[var(--text-primary)]">
                        {stat.value}
                      </p>
                    )}
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bgColor} ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Realtime Metrics */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-[var(--text-primary)] flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            {t('dashboard.chart.realtimeMetrics')}
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchRealtimeMetrics}
            isLoading={loadingRealtime}
          >
            <Activity className="w-4 h-4 mr-2" />
            {t('dashboard.chart.refresh')}
          </Button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {realtimeCards.map((card, index) => (
            <Card key={index} className="hover:border-red-500/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">{card.title}</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${card.bgColor} ${card.color}`}>
                    <card.icon className="w-4 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Requests Trend */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('dashboard.chart.requests7Days')}</CardTitle>
            <Link
              to="/admin/usage"
              className="text-sm text-[var(--accent-primary)] hover:underline flex items-center gap-1"
            >
              {t('dashboard.chart.viewAll')} <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {loading ? (
                <Skeleton className="h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="requestsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
                    <XAxis dataKey="date" stroke={CHART_AXIS_COLOR} fontSize={12} />
                    <YAxis stroke={CHART_AXIS_COLOR} fontSize={12} />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                    />
                    <Area
                      type="monotone"
                      dataKey="requests"
                      stroke="#EF4444"
                      fillOpacity={1}
                      fill="url(#requestsGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cost Trend */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('dashboard.chart.cost7Days')}</CardTitle>
            <Link
              to="/admin/usage"
              className="text-sm text-[var(--accent-primary)] hover:underline flex items-center gap-1"
            >
              {t('dashboard.chart.viewAll')} <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {loading ? (
                <Skeleton className="h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
                    <XAxis dataKey="date" stroke={CHART_AXIS_COLOR} fontSize={12} />
                    <YAxis stroke={CHART_AXIS_COLOR} fontSize={12} />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                    />
                    <Area
                      type="monotone"
                      dataKey="cost"
                      stroke="#F59E0B"
                      fillOpacity={1}
                      fill="url(#costGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Users Trend */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              {t('dashboard.chart.usersTrend')}
            </CardTitle>
            <Link
              to="/admin/users"
              className="text-sm text-[var(--accent-primary)] hover:underline flex items-center gap-1"
            >
              {t('dashboard.chart.viewAll')} <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {loading ? (
                <Skeleton className="h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usersTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
                    <XAxis
                      dataKey="timestamp"
                      stroke={CHART_AXIS_COLOR}
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis stroke={CHART_AXIS_COLOR} fontSize={12} />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                    />
                    <Line
                      type="monotone"
                      dataKey="total_users"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={false}
                      name={t('dashboard.legend.totalUsers')}
                    />
                    <Line
                      type="monotone"
                      dataKey="new_users"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={false}
                      name={t('dashboard.legend.newUsers')}
                    />
                    <Line
                      type="monotone"
                      dataKey="active_users"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      dot={false}
                      name={t('dashboard.legend.activeUsers')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* API Keys Trend */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-purple-400" />
              {t('dashboard.chart.apiKeysTrend')}
            </CardTitle>
            <Link
              to="/admin/users"
              className="text-sm text-[var(--accent-primary)] hover:underline flex items-center gap-1"
            >
              {t('dashboard.chart.viewAll')} <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {loading ? (
                <Skeleton className="h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={apiKeysTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
                    <XAxis
                      dataKey="timestamp"
                      stroke={CHART_AXIS_COLOR}
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis stroke={CHART_AXIS_COLOR} fontSize={12} />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                    />
                    <Line
                      type="monotone"
                      dataKey="total_keys"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={false}
                      name={t('dashboard.legend.totalKeys')}
                    />
                    <Line
                      type="monotone"
                      dataKey="new_keys"
                      stroke="#EC4899"
                      strokeWidth={2}
                      dot={false}
                      name={t('dashboard.legend.newKeys')}
                    />
                    <Line
                      type="monotone"
                      dataKey="active_keys"
                      stroke="#06B6D4"
                      strokeWidth={2}
                      dot={false}
                      name={t('dashboard.legend.activeKeys')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Models Distribution & Usage Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Models Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              {t('dashboard.chart.modelDistribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {loading ? (
                <Skeleton className="h-full" />
              ) : modelStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modelStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="requests"
                      nameKey="model"
                    >
                      {modelStats.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                      formatter={(value: number, name: string) => [`${value.toLocaleString()} reqs`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
                  {t('dashboard.noModelData')}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {modelStats.slice(0, 6).map((m, i) => (
                <div key={m.model} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs text-[var(--text-secondary)] truncate max-w-[100px]">{m.model}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Users by Cost */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              {t('dashboard.chart.topUsersByCost')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={40} />)}
              </div>
            ) : topUsers.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topUsers} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} horizontal={false} />
                    <XAxis type="number" stroke={CHART_AXIS_COLOR} fontSize={11} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                    <YAxis
                      type="category"
                      dataKey="username"
                      stroke={CHART_AXIS_COLOR}
                      fontSize={11}
                      width={80}
                      tickFormatter={(v) => v.length > 10 ? v.slice(0, 10) + '...' : v}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                      formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']}
                    />
                    <Bar dataKey="total_cost" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-[var(--text-muted)] text-sm">
                {t('dashboard.noUserUsageData')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top API Keys by Cost */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-purple-400" />
              {t('dashboard.chart.topApiKeysByCost')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={40} />)}
              </div>
            ) : topApiKeys.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topApiKeys} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} horizontal={false} />
                    <XAxis type="number" stroke={CHART_AXIS_COLOR} fontSize={11} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                    <YAxis
                      type="category"
                      dataKey="api_key_name"
                      stroke={CHART_AXIS_COLOR}
                      fontSize={11}
                      width={80}
                      tickFormatter={(v) => v.length > 10 ? v.slice(0, 10) + '...' : v}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                      formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']}
                    />
                    <Bar dataKey="total_cost" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-[var(--text-muted)] text-sm">
                {t('dashboard.noApiKeyUsageData')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: t('dashboard.quickAction.manageUsers'), path: '/admin/users', desc: t('dashboard.quickAction.manageUsersDesc') },
              { label: t('dashboard.quickAction.manageAccounts'), path: '/admin/accounts', desc: t('dashboard.quickAction.manageAccountsDesc') },
              { label: t('dashboard.quickAction.viewUsage'), path: '/admin/usage', desc: t('dashboard.quickAction.viewUsageDesc') },
              { label: t('dashboard.quickAction.systemSettings'), path: '/admin/settings', desc: t('dashboard.quickAction.systemSettingsDesc') },
            ].map((action) => (
              <Link
                key={action.path}
                to={action.path}
                className="p-4 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--accent-soft)] transition-colors group"
              >
                <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                  {action.label}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{action.desc}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Backfill Modal */}
      <Modal
        isOpen={showBackfillModal}
        onClose={() => { setShowBackfillModal(false); setBackfillResult(null); setBackfillParams({}); }}
        title={t('dashboard.backfillModal.title')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('dashboard.backfillModal.granularity')}</label>
              <select
                value={backfillParams.granularity || ''}
                onChange={(e) => setBackfillParams({ ...backfillParams, granularity: e.target.value })}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:border-[var(--focus-ring)] focus:outline-none"
              >
                <option value="">{t('dashboard.backfillModal.allGranularities')}</option>
                <option value="minute">Minute</option>
                <option value="hour">Hour</option>
                <option value="day">Day</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('dashboard.backfillModal.model')}</label>
              <Input placeholder={t('dashboard.backfillModal.modelPlaceholder')} value={backfillParams.model || ''} onChange={(e) => setBackfillParams({ ...backfillParams, model: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('dashboard.backfillModal.userId')}</label>
              <Input type="number" placeholder="User ID" value={backfillParams.user_id || ''} onChange={(e) => setBackfillParams({ ...backfillParams, user_id: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('dashboard.backfillModal.groupId')}</label>
              <Input type="number" placeholder="Group ID" value={backfillParams.group_id || ''} onChange={(e) => setBackfillParams({ ...backfillParams, group_id: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('dashboard.backfillModal.accountId')}</label>
              <Input type="number" placeholder="Account ID" value={backfillParams.account_id || ''} onChange={(e) => setBackfillParams({ ...backfillParams, account_id: e.target.value })} />
            </div>
          </div>
          {backfillResult && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <p className="text-sm text-emerald-400">{t('dashboard.backfillModal.success', { count: backfillResult.backfilled_count })}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setShowBackfillModal(false); setBackfillResult(null); setBackfillParams({}); }}>{t('common:btn.cancel')}</Button>
            <Button onClick={handleBackfill} isLoading={backfillLoading}>{t('dashboard.backfillModal.run')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboardPage;
