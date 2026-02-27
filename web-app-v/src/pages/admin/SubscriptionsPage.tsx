import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  Plus,
  Trash2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Search,
  XCircle,
  UserPlus,
  Users,
  Eye,
} from 'lucide-react';
import { adminSubscriptionsApi, type AdminSubscriptionQueryParams } from '../../api/admin/subscriptions';
import { adminGroupsApi } from '../../api/admin/groups';
import type { UserSubscription, Group } from '../../types';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  Table,
  Modal,
  Skeleton,
} from '../../components/ui';

const getStatusBadge = (status: string, t: (key: string) => string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return <Badge variant="success">{t('common:status.active')}</Badge>;
    case 'expired':
      return <Badge variant="danger">{t('common:status.expired')}</Badge>;
    case 'revoked':
      return <Badge variant="danger">{t('common:status.revoked')}</Badge>;
    case 'pending':
      return <Badge variant="info">{t('common:status.pending')}</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDateTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface SubscriptionWithDetails extends UserSubscription {
  user_email?: string;
  group_name?: string;
}

interface SubscriptionStats {
  total_subscriptions: number;
  active_subscriptions: number;
  expired_subscriptions: number;
  revoked_subscriptions: number;
  total_value: number;
}

export const SubscriptionsPage: React.FC = () => {
  const { t } = useTranslation('admin');
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithDetails[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [userIdFilter, setUserIdFilter] = useState<string>('');
  const [groupIdFilter, setGroupIdFilter] = useState<string>('');
  const [groups, setGroups] = useState<Group[]>([]);

  // Modal states
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithDetails | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressData, setProgressData] = useState<{
    subscription: UserSubscription;
    daily_usage: number;
    daily_limit: number;
    weekly_usage: number;
    weekly_limit: number;
    monthly_usage: number;
    monthly_limit: number;
  } | null>(null);
  const [bulkAssignResult, setBulkAssignResult] = useState<{
    success_count: number;
    failed_count: number;
    errors?: string[];
  } | null>(null);

  // Form state for create
  const [createForm, setCreateForm] = useState({
    user_id: '',
    group_id: '',
    starts_at: new Date().toISOString().split('T')[0],
    expires_at: '',
  });

  // Form state for extend
  const [extendForm, setExtendForm] = useState({
    days: 30,
    reason: '',
  });

  // Form state for revoke
  const [revokeReason, setRevokeReason] = useState('');

  // Form state for assign
  const [assignForm, setAssignForm] = useState({
    user_id: '',
    group_id: '',
    starts_at: new Date().toISOString().split('T')[0],
    expires_at: '',
  });

  // Form state for bulk assign
  const [bulkAssignForm, setBulkAssignForm] = useState({
    user_ids: '',
    group_id: '',
    starts_at: new Date().toISOString().split('T')[0],
    expires_at: '',
  });

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const params: AdminSubscriptionQueryParams = {
        page,
        page_size: pageSize,
      };
      if (statusFilter) params.status = statusFilter;
      if (userIdFilter) params.user_id = parseInt(userIdFilter);
      if (groupIdFilter) params.group_id = parseInt(groupIdFilter);

      const response = await adminSubscriptionsApi.getSubscriptions(params);
      setSubscriptions(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, userIdFilter, groupIdFilter]);

  const fetchGroups = useCallback(async () => {
    try {
      const response = await adminGroupsApi.getGroups({ page_size: 100 });
      setGroups(response.items);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleCreateSubscription = async () => {
    if (!createForm.user_id || !createForm.group_id || !createForm.expires_at) return;

    setActionLoading(true);
    try {
      await adminSubscriptionsApi.createSubscription({
        user_id: parseInt(createForm.user_id),
        group_id: parseInt(createForm.group_id),
        starts_at: new Date(createForm.starts_at).toISOString(),
        expires_at: new Date(createForm.expires_at).toISOString(),
      });
      setShowCreateModal(false);
      resetCreateForm();
      fetchSubscriptions();
    } catch (error) {
      console.error('Failed to create subscription:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendSubscription = async () => {
    if (!selectedSubscription || extendForm.days <= 0) return;

    setActionLoading(true);
    try {
      await adminSubscriptionsApi.extendSubscription(selectedSubscription.id, {
        days: extendForm.days,
        reason: extendForm.reason || undefined,
      });
      setShowExtendModal(false);
      setSelectedSubscription(null);
      resetExtendForm();
      fetchSubscriptions();
    } catch (error) {
      console.error('Failed to extend subscription:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeSubscription = async () => {
    if (!selectedSubscription) return;

    setActionLoading(true);
    try {
      await adminSubscriptionsApi.revokeSubscription(selectedSubscription.id, {
        reason: revokeReason || undefined,
      });
      setShowRevokeModal(false);
      setSelectedSubscription(null);
      setRevokeReason('');
      fetchSubscriptions();
    } catch (error) {
      console.error('Failed to revoke subscription:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSubscription = async () => {
    if (!selectedSubscription) return;

    setActionLoading(true);
    try {
      await adminSubscriptionsApi.deleteSubscription(selectedSubscription.id);
      setShowDeleteModal(false);
      setSelectedSubscription(null);
      fetchSubscriptions();
    } catch (error) {
      console.error('Failed to delete subscription:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewStats = async () => {
    setShowStatsModal(true);
    setStatsLoading(true);
    try {
      const statsData = await adminSubscriptionsApi.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!assignForm.user_id || !assignForm.group_id || !assignForm.expires_at) return;
    setActionLoading(true);
    try {
      await adminSubscriptionsApi.assign({
        user_id: parseInt(assignForm.user_id),
        group_id: parseInt(assignForm.group_id),
        starts_at: new Date(assignForm.starts_at).toISOString(),
        expires_at: new Date(assignForm.expires_at).toISOString(),
      });
      setShowAssignModal(false);
      setAssignForm({ user_id: '', group_id: '', starts_at: new Date().toISOString().split('T')[0], expires_at: '' });
      fetchSubscriptions();
    } catch (error) {
      console.error('Failed to assign subscription:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignForm.user_ids || !bulkAssignForm.group_id || !bulkAssignForm.expires_at) return;
    setActionLoading(true);
    setBulkAssignResult(null);
    try {
      const userIds = bulkAssignForm.user_ids.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      const result = await adminSubscriptionsApi.bulkAssign({
        user_ids: userIds,
        group_id: parseInt(bulkAssignForm.group_id),
        starts_at: new Date(bulkAssignForm.starts_at).toISOString(),
        expires_at: new Date(bulkAssignForm.expires_at).toISOString(),
      });
      setBulkAssignResult(result);
      fetchSubscriptions();
    } catch (error) {
      console.error('Failed to bulk assign subscriptions:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewProgress = async (sub: SubscriptionWithDetails) => {
    setSelectedSubscription(sub);
    setShowProgressModal(true);
    setProgressLoading(true);
    setProgressData(null);
    try {
      const data = await adminSubscriptionsApi.getProgress(sub.id);
      setProgressData(data);
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    } finally {
      setProgressLoading(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      user_id: '',
      group_id: '',
      starts_at: new Date().toISOString().split('T')[0],
      expires_at: '',
    });
  };

  const resetExtendForm = () => {
    setExtendForm({
      days: 30,
      reason: '',
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  const columns = [
    {
      key: 'id',
      title: t('subscriptions.col.id'),
      render: (sub: SubscriptionWithDetails) => (
        <span className="text-sm text-gray-400">#{sub.id}</span>
      ),
    },
    {
      key: 'user',
      title: t('subscriptions.col.user'),
      render: (sub: SubscriptionWithDetails) => (
        <div>
          <p className="text-sm font-medium text-white">
            {sub.user_email || `User #${sub.user_id}`}
          </p>
          <p className="text-xs text-gray-500">ID: {sub.user_id}</p>
        </div>
      ),
    },
    {
      key: 'group',
      title: t('subscriptions.col.group'),
      render: (sub: SubscriptionWithDetails) => (
        <div>
          <p className="text-sm font-medium text-cyan-400">
            {sub.group_name || sub.group?.name || `Group #${sub.group_id}`}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      title: t('subscriptions.col.status'),
      render: (sub: SubscriptionWithDetails) => getStatusBadge(sub.status, t),
    },
    {
      key: 'period',
      title: t('subscriptions.col.period'),
      render: (sub: SubscriptionWithDetails) => (
        <div className="text-sm">
          <p className="text-gray-400">{formatDate(sub.starts_at)}</p>
          <p className="text-gray-500">to {formatDate(sub.expires_at)}</p>
        </div>
      ),
    },
    {
      key: 'usage',
      title: t('subscriptions.col.usage'),
      render: (sub: SubscriptionWithDetails) => (
        <div className="text-sm">
          <p className="text-gray-400">D: ${sub.daily_usage_usd?.toFixed(2) || '0.00'}</p>
          <p className="text-gray-500">M: ${sub.monthly_usage_usd?.toFixed(2) || '0.00'}</p>
        </div>
      ),
    },
    {
      key: 'actions',
      title: t('subscriptions.col.actions'),
      render: (sub: SubscriptionWithDetails) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewProgress(sub)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-cyan-400 transition-colors"
            title={t('subscriptions.viewProgress')}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedSubscription(sub);
              setShowExtendModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-cyan-400 transition-colors"
            title={t('subscriptions.extendTitle')}
            disabled={sub.status === 'revoked'}
          >
            <Clock className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedSubscription(sub);
              setShowRevokeModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-amber-400 transition-colors"
            title={t('subscriptions.revokeTitle')}
            disabled={sub.status === 'revoked'}
          >
            <XCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedSubscription(sub);
              setShowDeleteModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-red-400 transition-colors"
            title={t('subscriptions.deleteTitle')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{t('subscriptions.title')}</h1>
          <p className="text-gray-400">{t('subscriptions.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleViewStats}>
            <CreditCard className="w-4 h-4 mr-2" />
            {t('subscriptions.stats')}
          </Button>
          <Button variant="secondary" onClick={() => setShowAssignModal(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            {t('subscriptions.assign')}
          </Button>
          <Button variant="secondary" onClick={() => { setShowBulkAssignModal(true); setBulkAssignResult(null); }}>
            <Users className="w-4 h-4 mr-2" />
            {t('subscriptions.bulkAssign')}
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('subscriptions.create')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <Input
                placeholder={t('subscriptions.filter.userId')}
                value={userIdFilter}
                onChange={(e) => {
                  setUserIdFilter(e.target.value);
                  setPage(1);
                }}
                className="w-32"
              />
            </div>
            <select
              value={groupIdFilter}
              onChange={(e) => {
                setGroupIdFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="">{t('subscriptions.filter.allGroups')}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="">{t('subscriptions.filter.allStatus')}</option>
              <option value="active">{t('common:status.active')}</option>
              <option value="expired">{t('common:status.expired')}</option>
              <option value="revoked">{t('common:status.revoked')}</option>
              <option value="pending">{t('common:status.pending')}</option>
            </select>
            <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
              <CreditCard className="w-4 h-4" />
              <span>{t('subscriptions.total', { count: total })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={subscriptions}
            loading={loading}
            emptyText={t('subscriptions.empty')}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#2A2A30]">
              <p className="text-sm text-gray-400">
                {t('common:table.showing', { start: (page - 1) * pageSize + 1, end: Math.min(page * pageSize, total), total })}
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
                  {t('common:table.page', { current: page, total: totalPages })}
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
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetCreateForm();
        }}
        title={t('subscriptions.createTitle')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('subscriptions.form.userId')} *</label>
            <Input
              type="number"
              placeholder={t('subscriptions.form.userId')}
              value={createForm.user_id}
              onChange={(e) => setCreateForm({ ...createForm, user_id: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('subscriptions.form.group')} *</label>
            <select
              value={createForm.group_id}
              onChange={(e) => setCreateForm({ ...createForm, group_id: e.target.value })}
              className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="">{t('subscriptions.form.selectGroup')}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.platform})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('subscriptions.form.startDate')} *</label>
              <Input
                type="date"
                value={createForm.starts_at}
                onChange={(e) => setCreateForm({ ...createForm, starts_at: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('subscriptions.form.endDate')} *</label>
              <Input
                type="date"
                value={createForm.expires_at}
                onChange={(e) => setCreateForm({ ...createForm, expires_at: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                resetCreateForm();
              }}
            >
              {t('common:btn.cancel')}
            </Button>
            <Button
              onClick={handleCreateSubscription}
              isLoading={actionLoading}
              disabled={!createForm.user_id || !createForm.group_id || !createForm.expires_at}
            >
              {t('subscriptions.create')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Extend Modal */}
      <Modal
        isOpen={showExtendModal}
        onClose={() => {
          setShowExtendModal(false);
          setSelectedSubscription(null);
          resetExtendForm();
        }}
        title={t('subscriptions.extendTitle')}
      >
        {selectedSubscription && (
          <div className="space-y-4">
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-sm text-gray-400">{t('subscriptions.currentExpiration')}:</p>
              <p className="text-white font-medium">
                {formatDateTime(selectedSubscription.expires_at)}
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('subscriptions.form.extendDays')} *</label>
              <Input
                type="number"
                min="1"
                placeholder="30"
                value={extendForm.days}
                onChange={(e) => setExtendForm({ ...extendForm, days: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('subscriptions.form.reason')}</label>
              <Input
                placeholder={t('subscriptions.form.reasonRequired')}
                value={extendForm.reason}
                onChange={(e) => setExtendForm({ ...extendForm, reason: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowExtendModal(false);
                  setSelectedSubscription(null);
                  resetExtendForm();
                }}
              >
                {t('common:btn.cancel')}
              </Button>
              <Button
                onClick={handleExtendSubscription}
                isLoading={actionLoading}
                disabled={extendForm.days <= 0}
              >
                {t('subscriptions.extendConfirm')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Revoke Modal */}
      <Modal
        isOpen={showRevokeModal}
        onClose={() => {
          setShowRevokeModal(false);
          setSelectedSubscription(null);
          setRevokeReason('');
        }}
        title={t('subscriptions.revokeTitle')}
      >
        {selectedSubscription && (
          <div className="space-y-4">
            <p className="text-gray-400">
              {t('subscriptions.revokeConfirm', { user: selectedSubscription.user_email || `User #${selectedSubscription.user_id}` })}
            </p>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('subscriptions.form.reason')}</label>
              <Input
                placeholder={t('subscriptions.form.revokeReason')}
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
              />
            </div>
            <p className="text-sm text-amber-400">
              {t('subscriptions.revokeWarning')}
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowRevokeModal(false);
                  setSelectedSubscription(null);
                  setRevokeReason('');
                }}
              >
                {t('common:btn.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleRevokeSubscription}
                isLoading={actionLoading}
              >
                {t('subscriptions.revokeTitle')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedSubscription(null);
        }}
        title={t('subscriptions.deleteTitle')}
      >
        {selectedSubscription && (
          <div className="space-y-4">
            <p className="text-gray-400">
              {t('subscriptions.deleteConfirm', { user: selectedSubscription.user_email || `User #${selectedSubscription.user_id}` })}
            </p>
            <p className="text-sm text-red-400">
              {t('subscriptions.deleteWarning')}
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedSubscription(null);
                }}
              >
                {t('common:btn.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteSubscription}
                isLoading={actionLoading}
              >
                {t('subscriptions.deleteTitle')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Stats Modal */}
      <Modal
        isOpen={showStatsModal}
        onClose={() => {
          setShowStatsModal(false);
          setStats(null);
        }}
        title={t('subscriptions.statsTitle')}
      >
        {statsLoading ? (
          <div className="space-y-4">
            <Skeleton height={60} />
            <Skeleton height={60} />
            <Skeleton height={60} />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">{t('subscriptions.stat.total')}</p>
              <p className="text-xl font-bold text-white">{stats.total_subscriptions}</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">{t('subscriptions.stat.active')}</p>
              <p className="text-xl font-bold text-emerald-400">{stats.active_subscriptions}</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">{t('subscriptions.stat.expired')}</p>
              <p className="text-xl font-bold text-gray-400">{stats.expired_subscriptions}</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">{t('subscriptions.stat.revoked')}</p>
              <p className="text-xl font-bold text-red-400">{stats.revoked_subscriptions}</p>
            </div>
            <div className="col-span-2 p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">{t('subscriptions.stat.totalValue')}</p>
              <p className="text-xl font-bold text-cyan-400">${stats.total_value?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Failed to load stats</p>
        )}
      </Modal>

      {/* Assign Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setAssignForm({ user_id: '', group_id: '', starts_at: new Date().toISOString().split('T')[0], expires_at: '' });
        }}
        title={t('subscriptions.assignTitle')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('subscriptions.form.userId')} *</label>
            <Input
              type="number"
              placeholder={t('subscriptions.form.userId')}
              value={assignForm.user_id}
              onChange={(e) => setAssignForm({ ...assignForm, user_id: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('subscriptions.form.group')} *</label>
            <select
              value={assignForm.group_id}
              onChange={(e) => setAssignForm({ ...assignForm, group_id: e.target.value })}
              className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="">{t('subscriptions.form.selectGroup')}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.platform})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('subscriptions.form.startDate')} *</label>
              <Input
                type="date"
                value={assignForm.starts_at}
                onChange={(e) => setAssignForm({ ...assignForm, starts_at: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('subscriptions.form.endDate')} *</label>
              <Input
                type="date"
                value={assignForm.expires_at}
                onChange={(e) => setAssignForm({ ...assignForm, expires_at: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAssignModal(false);
                setAssignForm({ user_id: '', group_id: '', starts_at: new Date().toISOString().split('T')[0], expires_at: '' });
              }}
            >
              {t('common:btn.cancel')}
            </Button>
            <Button
              onClick={handleAssign}
              isLoading={actionLoading}
              disabled={!assignForm.user_id || !assignForm.group_id || !assignForm.expires_at}
            >
              {t('subscriptions.assign')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Assign Modal */}
      <Modal
        isOpen={showBulkAssignModal}
        onClose={() => {
          setShowBulkAssignModal(false);
          setBulkAssignForm({ user_ids: '', group_id: '', starts_at: new Date().toISOString().split('T')[0], expires_at: '' });
          setBulkAssignResult(null);
        }}
        title={t('subscriptions.bulkAssignTitle')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('subscriptions.form.userIds')} *</label>
            <textarea
              placeholder={t('subscriptions.form.userIdsPlaceholder')}
              value={bulkAssignForm.user_ids}
              onChange={(e) => setBulkAssignForm({ ...bulkAssignForm, user_ids: e.target.value })}
              rows={3}
              className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-[#00F0FF] outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('subscriptions.form.group')} *</label>
            <select
              value={bulkAssignForm.group_id}
              onChange={(e) => setBulkAssignForm({ ...bulkAssignForm, group_id: e.target.value })}
              className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="">{t('subscriptions.form.selectGroup')}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.platform})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('subscriptions.form.startDate')} *</label>
              <Input
                type="date"
                value={bulkAssignForm.starts_at}
                onChange={(e) => setBulkAssignForm({ ...bulkAssignForm, starts_at: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('subscriptions.form.endDate')} *</label>
              <Input
                type="date"
                value={bulkAssignForm.expires_at}
                onChange={(e) => setBulkAssignForm({ ...bulkAssignForm, expires_at: e.target.value })}
              />
            </div>
          </div>

          {bulkAssignResult && (
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-sm text-emerald-400 mb-1">
                {t('subscriptions.bulkAssignSuccess', { count: bulkAssignResult.success_count })}
              </p>
              {bulkAssignResult.failed_count > 0 && (
                <p className="text-sm text-red-400">
                  {t('subscriptions.bulkAssignFailed', { count: bulkAssignResult.failed_count })}
                </p>
              )}
              {bulkAssignResult.errors && bulkAssignResult.errors.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  {bulkAssignResult.errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowBulkAssignModal(false);
                setBulkAssignForm({ user_ids: '', group_id: '', starts_at: new Date().toISOString().split('T')[0], expires_at: '' });
                setBulkAssignResult(null);
              }}
            >
              {t('common:btn.cancel')}
            </Button>
            <Button
              onClick={handleBulkAssign}
              isLoading={actionLoading}
              disabled={!bulkAssignForm.user_ids || !bulkAssignForm.group_id || !bulkAssignForm.expires_at}
            >
              {t('subscriptions.bulkAssign')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Progress Modal */}
      <Modal
        isOpen={showProgressModal}
        onClose={() => {
          setShowProgressModal(false);
          setSelectedSubscription(null);
          setProgressData(null);
        }}
        title={t('subscriptions.progressTitle')}
      >
        {progressLoading ? (
          <div className="space-y-4">
            <Skeleton height={60} />
            <Skeleton height={60} />
            <Skeleton height={60} />
          </div>
        ) : progressData ? (
          <div className="space-y-4">
            {[
              { label: t('subscriptions.progress.daily'), usage: progressData.daily_usage, limit: progressData.daily_limit },
              { label: t('subscriptions.progress.weekly'), usage: progressData.weekly_usage, limit: progressData.weekly_limit },
              { label: t('subscriptions.progress.monthly'), usage: progressData.monthly_usage, limit: progressData.monthly_limit },
            ].map((item) => {
              const pct = item.limit > 0 ? Math.min((item.usage / item.limit) * 100, 100) : 0;
              const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-cyan-500';
              return (
                <div key={item.label} className="p-4 bg-[#0A0A0C] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-400">{item.label}</p>
                    <p className="text-sm text-white">
                      ${item.usage.toFixed(2)} / {item.limit > 0 ? `$${item.limit.toFixed(2)}` : t('subscriptions.progress.unlimited')}
                    </p>
                  </div>
                  {item.limit > 0 && (
                    <div className="w-full h-2 bg-[#2A2A30] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400">{t('subscriptions.progressFailed')}</p>
        )}
      </Modal>
    </div>
  );
};

export default SubscriptionsPage;
