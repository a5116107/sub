import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  CreditCard,
  Key,
  TrendingUp,
  Zap,
  ArrowRight,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { userApi } from '../../api/user';
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from '../../components/ui';

interface DashboardData {
  user: {
    balance: number;
    concurrency: number;
  };
  stats: {
    today_requests: number;
    today_cost: number;
    month_requests: number;
    month_cost: number;
  };
  recent_usage: unknown[];
  announcements: Array<{
    id: number;
    title: string;
    type: string;
    created_at: string;
  }>;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await userApi.getDashboard();
        setData(response);
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const stats = [
    {
      title: 'Balance',
      value: data?.user?.balance != null ? `$${data.user.balance.toFixed(2)}` : '$0.00',
      icon: CreditCard,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      link: '/app/billing',
    },
    {
      title: 'Today\'s Usage',
      value: data?.stats?.today_requests != null ? `${data.stats.today_requests.toLocaleString()}` : '0',
      subtitle: data?.stats?.today_cost != null ? `$${data.stats.today_cost.toFixed(4)}` : '$0.00',
      icon: Activity,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      link: '/app/usage',
    },
    {
      title: 'Month Usage',
      value: data?.stats?.month_requests != null ? `${data.stats.month_requests.toLocaleString()}` : '0',
      subtitle: data?.stats?.month_cost != null ? `$${data.stats.month_cost.toFixed(4)}` : '$0.00',
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      link: '/app/usage',
    },
    {
      title: 'Concurrency',
      value: `${user?.concurrency || 0}`,
      icon: Zap,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      link: '/app/settings/profile',
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          Welcome back, {user?.username || 'User'}
        </h1>
        <p className="text-gray-400">
          Here's what's happening with your account today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <Link key={index} to={stat.link}>
            <Card className="h-full hover:border-[#00F0FF]/30 transition-colors group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                    {loading ? (
                      <Skeleton width={80} height={28} />
                    ) : (
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                    )}
                    {stat.subtitle && !loading && (
                      <p className="text-sm text-gray-400 mt-1">{stat.subtitle}</p>
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Usage */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Usage</CardTitle>
              <Link
                to="/app/usage"
                className="text-sm text-[#00F0FF] hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} height={48} />
                  ))}
                </div>
              ) : data?.recent_usage && data.recent_usage.length > 0 ? (
                <div className="space-y-3">
                  {(data.recent_usage as Array<{ id: number; model: string; total_cost: number; created_at: string }>).slice(0, 5).map((usage) => (
                    <div
                      key={usage.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{usage.model}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(usage.created_at).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-emerald-400">
                        ${usage.total_cost.toFixed(6)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recent usage data
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                to="/app/api-keys"
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
              >
                <div className="p-2 rounded-lg bg-[#00F0FF]/10 text-[#00F0FF]">
                  <Key className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Manage API Keys</p>
                  <p className="text-xs text-gray-500">Create and manage your API keys</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
              </Link>
              <Link
                to="/app/redeem"
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
              >
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Redeem Code</p>
                  <p className="text-xs text-gray-500">Redeem a gift code for balance</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
              </Link>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} height={60} />
                  ))}
                </div>
              ) : data?.announcements && data.announcements.length > 0 ? (
                <div className="space-y-3">
                  {data.announcements.slice(0, 3).map((announcement) => (
                    <div
                      key={announcement.id}
                      className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={announcement.type === 'important' ? 'danger' : 'info'} size="sm">
                          {announcement.type}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(announcement.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-white">{announcement.title}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No announcements
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
