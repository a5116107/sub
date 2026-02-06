import React, { useEffect, useState } from 'react';
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

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null);
  const [usersTrend, setUsersTrend] = useState<UsersTrendData[]>([]);
  const [apiKeysTrend, setApiKeysTrend] = useState<ApiKeysTrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRealtime, setLoadingRealtime] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, trendsRes, usersTrendRes, apiKeysTrendRes] = await Promise.all([
          adminApi.getDashboardStats(),
          adminApi.getDashboardTrends({ days: 7 }),
          adminApi.getUsersTrend({ granularity: 'day', limit: 7 }),
          adminApi.getApiKeysTrend({ granularity: 'day', limit: 7 }),
        ]);
        setStats(statsRes);
        setTrends(Array.isArray(trendsRes) ? trendsRes : []);
        setUsersTrend(Array.isArray(usersTrendRes) ? usersTrendRes : []);
        setApiKeysTrend(Array.isArray(apiKeysTrendRes) ? apiKeysTrendRes : []);
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

  useEffect(() => {
    fetchRealtimeMetrics();
    // Refresh realtime metrics every 30 seconds
    const interval = setInterval(fetchRealtimeMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.total_users.toLocaleString() || '0',
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      link: '/admin/users',
    },
    {
      title: 'Total Accounts',
      value: stats?.total_accounts.toLocaleString() || '0',
      icon: Database,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      link: '/admin/accounts',
    },
    {
      title: "Today's Requests",
      value: stats?.total_requests_today.toLocaleString() || '0',
      icon: Activity,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      link: '/admin/usage',
    },
    {
      title: "Today's Cost",
      value: `$${(stats?.total_cost_today ?? 0).toFixed(4)}`,
      icon: TrendingUp,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      link: '/admin/usage',
    },
    {
      title: 'Active Subscriptions',
      value: stats?.active_subscriptions.toLocaleString() || '0',
      icon: Server,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      link: '/admin/subscriptions',
    },
    {
      title: 'System Status',
      value: stats?.system_status || 'Unknown',
      icon: stats?.system_status === 'healthy' ? CheckCircle : AlertCircle,
      color: stats?.system_status === 'healthy' ? 'text-green-400' : 'text-red-400',
      bgColor: stats?.system_status === 'healthy' ? 'bg-green-500/10' : 'bg-red-500/10',
      isStatus: true,
    },
  ];

  const realtimeCards = [
    {
      title: 'Current QPS',
      value: (realtimeMetrics?.current_qps ?? 0).toFixed(2),
      icon: Zap,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Avg Latency',
      value: `${(realtimeMetrics?.current_latency_ms ?? 0).toFixed(0)} ms`,
      icon: Clock,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
    },
    {
      title: 'Active Requests',
      value: (realtimeMetrics?.active_requests ?? 0).toString(),
      icon: Activity,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
    },
    {
      title: 'Error Rate',
      value: `${(realtimeMetrics?.error_rate ?? 0).toFixed(2)}%`,
      icon: AlertCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-400">
          Overview of system performance and key metrics
        </p>
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
                    <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
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
                      <p className="text-2xl font-bold text-white">
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
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Real-time Metrics
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchRealtimeMetrics}
            isLoading={loadingRealtime}
          >
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {realtimeCards.map((card, index) => (
            <Card key={index} className="hover:border-red-500/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{card.title}</p>
                    <p className="text-xl font-bold text-white">{card.value}</p>
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
            <CardTitle>Requests (7 Days)</CardTitle>
            <Link
              to="/admin/usage"
              className="text-sm text-red-400 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" />
                    <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#121215',
                        border: '1px solid #2A2A30',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#fff' }}
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
            <CardTitle>Cost (7 Days)</CardTitle>
            <Link
              to="/admin/usage"
              className="text-sm text-red-400 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" />
                    <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#121215',
                        border: '1px solid #2A2A30',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#fff' }}
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
              Users Trend
            </CardTitle>
            <Link
              to="/admin/users"
              className="text-sm text-red-400 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {loading ? (
                <Skeleton className="h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usersTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" />
                    <XAxis
                      dataKey="timestamp"
                      stroke="#6B7280"
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#121215',
                        border: '1px solid #2A2A30',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#fff' }}
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                    />
                    <Line
                      type="monotone"
                      dataKey="total_users"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={false}
                      name="Total Users"
                    />
                    <Line
                      type="monotone"
                      dataKey="new_users"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={false}
                      name="New Users"
                    />
                    <Line
                      type="monotone"
                      dataKey="active_users"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      dot={false}
                      name="Active Users"
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
              API Keys Trend
            </CardTitle>
            <Link
              to="/admin/users"
              className="text-sm text-red-400 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {loading ? (
                <Skeleton className="h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={apiKeysTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" />
                    <XAxis
                      dataKey="timestamp"
                      stroke="#6B7280"
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#121215',
                        border: '1px solid #2A2A30',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#fff' }}
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                    />
                    <Line
                      type="monotone"
                      dataKey="total_keys"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={false}
                      name="Total Keys"
                    />
                    <Line
                      type="monotone"
                      dataKey="new_keys"
                      stroke="#EC4899"
                      strokeWidth={2}
                      dot={false}
                      name="New Keys"
                    />
                    <Line
                      type="monotone"
                      dataKey="active_keys"
                      stroke="#06B6D4"
                      strokeWidth={2}
                      dot={false}
                      name="Active Keys"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Manage Users', path: '/admin/users', desc: 'View and manage user accounts' },
              { label: 'Manage Accounts', path: '/admin/accounts', desc: 'Configure platform accounts' },
              { label: 'View Usage', path: '/admin/usage', desc: 'Monitor system-wide usage' },
              { label: 'System Settings', path: '/admin/settings', desc: 'Configure system options' },
            ].map((action) => (
              <Link
                key={action.path}
                to={action.path}
                className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
              >
                <p className="text-sm font-medium text-white group-hover:text-red-400 transition-colors">
                  {action.label}
                </p>
                <p className="text-xs text-gray-500 mt-1">{action.desc}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardPage;
