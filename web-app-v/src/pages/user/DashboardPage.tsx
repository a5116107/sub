import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  CreditCard,
  Key,
  Zap,
  ArrowRight,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { userApi } from '../../api/user';
import { usageApi } from '../../api/usage';
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from '../../components/ui';
import type { UsageLog, Announcement, DashboardStats } from '../../types';

interface UserProfileData {
  balance: number;
  concurrency: number;
}

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation('dashboard');
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [recentUsage, setRecentUsage] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [profileRes, statsRes, announcementsRes, logsRes] = await Promise.all([
          userApi.getProfile(),
          usageApi.getDashboardStats(),
          userApi.getAnnouncements().catch(() => [] as Announcement[]),
          usageApi.getLogs({ page_size: 5 }).catch(() => ({ items: [] as UsageLog[], total: 0, page: 1, page_size: 5 })),
        ]);

        setProfile({ balance: profileRes.balance, concurrency: profileRes.concurrency });
        setDashStats(statsRes);
        setAnnouncements(Array.isArray(announcementsRes) ? announcementsRes : []);
        setRecentUsage(logsRes.items || []);
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
      title: t('stats.balance'),
      value: profile?.balance != null ? `$${profile.balance.toFixed(2)}` : '$0.00',
      icon: CreditCard,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      link: '/app/billing',
    },
    {
      title: t('stats.todayUsage'),
      value: dashStats?.today_requests != null ? `${dashStats.today_requests.toLocaleString()}` : '0',
      subtitle: dashStats?.today_cost != null ? `$${dashStats.today_cost.toFixed(4)}` : '$0.00',
      icon: Activity,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      link: '/app/usage',
    },
    {
      title: t('stats.activeKeys'),
      value: dashStats?.active_keys != null ? `${dashStats.active_keys}` : '0',
      icon: Key,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      link: '/app/api-keys',
    },
    {
      title: t('stats.concurrency'),
      value: `${profile?.concurrency || user?.concurrency || 0}`,
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
        <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)] mb-2">
          {t('title', { username: user?.username || 'User' })}
        </h1>
        <p className="text-[var(--text-secondary)]">
          {t('subtitle')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <Link key={index} to={stat.link}>
            <Card className="h-full hover:border-[var(--accent-primary)] transition-colors group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-muted)] mb-1">{stat.title}</p>
                    {loading ? (
                      <Skeleton width={80} height={28} />
                    ) : (
                      <p className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
                    )}
                    {stat.subtitle && !loading && (
                      <p className="text-sm text-[var(--text-secondary)] mt-1">{stat.subtitle}</p>
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
              <CardTitle>{t('recentUsage.title')}</CardTitle>
              <Link
                to="/app/usage"
                className="text-sm text-[var(--accent-primary)] hover:underline flex items-center gap-1"
              >
                {t('recentUsage.viewAll')} <ArrowRight className="w-4 h-4" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} height={48} />
                  ))}
                </div>
              ) : recentUsage.length > 0 ? (
                <div className="space-y-3">
                  {recentUsage.slice(0, 5).map((usage) => (
                    <div
                      key={usage.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--accent-soft)] transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{usage.model}</p>
                        <p className="text-xs text-[var(--text-muted)]">
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
                <div className="text-center py-8 text-[var(--text-muted)]">
                  {t('recentUsage.empty')}
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
              <CardTitle>{t('quickActions.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                to="/app/api-keys"
                className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--accent-soft)] transition-colors group"
              >
                <div className="p-2 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-primary)]">
                  <Key className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{t('quickActions.manageKeys')}</p>
                  <p className="text-xs text-[var(--text-muted)]">{t('quickActions.manageKeysDesc')}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
              </Link>
              <Link
                to="/app/redeem"
                className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--accent-soft)] transition-colors group"
              >
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{t('quickActions.redeemCode')}</p>
                  <p className="text-xs text-[var(--text-muted)]">{t('quickActions.redeemCodeDesc')}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
              </Link>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                {t('announcements.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} height={60} />
                  ))}
                </div>
              ) : announcements.length > 0 ? (
                <div className="space-y-3">
                  {announcements.slice(0, 3).map((announcement) => (
                    <div
                      key={announcement.id}
                      className={`p-3 rounded-lg transition-colors ${
                        announcement.read_at
                          ? 'bg-[var(--surface-elevated)] hover:bg-[var(--accent-soft)]'
                          : 'bg-[var(--accent-soft)] border border-[color-mix(in_oklab,var(--accent-primary)_30%,transparent)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {!announcement.read_at && (
                          <Badge variant="info" size="sm">New</Badge>
                        )}
                        <span className="text-xs text-[var(--text-muted)]">
                          {new Date(announcement.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-primary)]">{announcement.title}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-[var(--text-muted)] text-sm">
                  {t('announcements.empty')}
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
