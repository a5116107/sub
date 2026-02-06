import React, { useEffect, useState, useCallback } from 'react';
import {
  CreditCard,
  Plus,
  Trash2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Search,
  XCircle,
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

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return <Badge variant="success">Active</Badge>;
    case 'expired':
      return <Badge variant="danger">Expired</Badge>;
    case 'revoked':
      return <Badge variant="danger">Revoked</Badge>;
    case 'pending':
      return <Badge variant="info">Pending</Badge>;
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
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

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
      title: 'ID',
      render: (sub: SubscriptionWithDetails) => (
        <span className="text-sm text-gray-400">#{sub.id}</span>
      ),
    },
    {
      key: 'user',
      title: 'User',
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
      title: 'Group',
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
      title: 'Status',
      render: (sub: SubscriptionWithDetails) => getStatusBadge(sub.status),
    },
    {
      key: 'period',
      title: 'Period',
      render: (sub: SubscriptionWithDetails) => (
        <div className="text-sm">
          <p className="text-gray-400">{formatDate(sub.starts_at)}</p>
          <p className="text-gray-500">to {formatDate(sub.expires_at)}</p>
        </div>
      ),
    },
    {
      key: 'usage',
      title: 'Usage (USD)',
      render: (sub: SubscriptionWithDetails) => (
        <div className="text-sm">
          <p className="text-gray-400">D: ${sub.daily_usage_usd?.toFixed(2) || '0.00'}</p>
          <p className="text-gray-500">M: ${sub.monthly_usage_usd?.toFixed(2) || '0.00'}</p>
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (sub: SubscriptionWithDetails) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedSubscription(sub);
              setShowExtendModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-cyan-400 transition-colors"
            title="Extend Subscription"
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
            title="Revoke Subscription"
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
            title="Delete Subscription"
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
          <h1 className="text-2xl font-bold text-white mb-1">Subscription Management</h1>
          <p className="text-gray-400">Manage user subscriptions and access</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleViewStats}>
            <CreditCard className="w-4 h-4 mr-2" />
            Stats
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Subscription
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
                placeholder="User ID"
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
              <option value="">All Groups</option>
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
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
              <option value="pending">Pending</option>
            </select>
            <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
              <CreditCard className="w-4 h-4" />
              <span>{total} total subscriptions</span>
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
            emptyText="No subscriptions found"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#2A2A30]">
              <p className="text-sm text-gray-400">
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, total)} of {total} subscriptions
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
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetCreateForm();
        }}
        title="Create Subscription"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">User ID *</label>
            <Input
              type="number"
              placeholder="Enter user ID"
              value={createForm.user_id}
              onChange={(e) => setCreateForm({ ...createForm, user_id: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Group *</label>
            <select
              value={createForm.group_id}
              onChange={(e) => setCreateForm({ ...createForm, group_id: e.target.value })}
              className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="">Select a group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.platform})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Start Date *</label>
              <Input
                type="date"
                value={createForm.starts_at}
                onChange={(e) => setCreateForm({ ...createForm, starts_at: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">End Date *</label>
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
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubscription}
              isLoading={actionLoading}
              disabled={!createForm.user_id || !createForm.group_id || !createForm.expires_at}
            >
              Create Subscription
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
        title="Extend Subscription"
      >
        {selectedSubscription && (
          <div className="space-y-4">
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-sm text-gray-400">Current expiration:</p>
              <p className="text-white font-medium">
                {formatDateTime(selectedSubscription.expires_at)}
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Extend by (days) *</label>
              <Input
                type="number"
                min="1"
                placeholder="30"
                value={extendForm.days}
                onChange={(e) => setExtendForm({ ...extendForm, days: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Reason (optional)</label>
              <Input
                placeholder="Reason for extension"
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
                Cancel
              </Button>
              <Button
                onClick={handleExtendSubscription}
                isLoading={actionLoading}
                disabled={extendForm.days <= 0}
              >
                Extend Subscription
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
        title="Revoke Subscription"
      >
        {selectedSubscription && (
          <div className="space-y-4">
            <p className="text-gray-400">
              Are you sure you want to revoke the subscription for{' '}
              <span className="text-white font-medium">
                {selectedSubscription.user_email || `User #${selectedSubscription.user_id}`}
              </span>
              ?
            </p>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Reason (optional)</label>
              <Input
                placeholder="Reason for revocation"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
              />
            </div>
            <p className="text-sm text-amber-400">
              This will immediately terminate the user's access to this group.
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
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleRevokeSubscription}
                isLoading={actionLoading}
              >
                Revoke Subscription
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
        title="Delete Subscription"
      >
        {selectedSubscription && (
          <div className="space-y-4">
            <p className="text-gray-400">
              Are you sure you want to delete the subscription for{' '}
              <span className="text-white font-medium">
                {selectedSubscription.user_email || `User #${selectedSubscription.user_id}`}
              </span>
              ?
            </p>
            <p className="text-sm text-red-400">
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedSubscription(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteSubscription}
                isLoading={actionLoading}
              >
                Delete Subscription
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
        title="Subscription Statistics"
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
              <p className="text-xs text-gray-500 mb-1">Total Subscriptions</p>
              <p className="text-xl font-bold text-white">{stats.total_subscriptions}</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Active</p>
              <p className="text-xl font-bold text-emerald-400">{stats.active_subscriptions}</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Expired</p>
              <p className="text-xl font-bold text-gray-400">{stats.expired_subscriptions}</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Revoked</p>
              <p className="text-xl font-bold text-red-400">{stats.revoked_subscriptions}</p>
            </div>
            <div className="col-span-2 p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Total Value</p>
              <p className="text-xl font-bold text-cyan-400">${stats.total_value?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Failed to load stats</p>
        )}
      </Modal>
    </div>
  );
};

export default SubscriptionsPage;
