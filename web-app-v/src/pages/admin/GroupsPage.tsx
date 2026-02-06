import React, { useEffect, useState, useCallback } from 'react';
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Users,
  Server,
} from 'lucide-react';
import { adminGroupsApi, type GroupQueryParams } from '../../api/admin/groups';
import type { Group } from '../../types';
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
    case 'disabled':
      return <Badge variant="danger">Disabled</Badge>;
    default:
      return <Badge variant="info">{status}</Badge>;
  }
};

const getPlatformBadge = (platform: string) => {
  const colors: Record<string, string> = {
    claude: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    openai: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    gemini: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };
  const colorClass = colors[platform.toLowerCase()] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  return (
    <span className={`px-2 py-0.5 rounded text-xs border ${colorClass}`}>
      {platform}
    </span>
  );
};

interface GroupStats {
  total_accounts: number;
  active_accounts: number;
  total_requests_today: number;
  total_cost_today: number;
  active_subscriptions: number;
}

export const GroupsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modal states
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [groupStats, setGroupStats] = useState<GroupStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Group>>({
    name: '',
    description: '',
    platform: 'claude',
    rate_multiplier: 1,
    is_exclusive: false,
    status: 'active',
    subscription_type: 'none',
    daily_limit_usd: undefined,
    weekly_limit_usd: undefined,
    monthly_limit_usd: undefined,
    user_concurrency: 5,
  });

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const params: GroupQueryParams = {
        page,
        page_size: pageSize,
      };
      if (platformFilter) params.platform = platformFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await adminGroupsApi.getGroups(params);
      setGroups(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, platformFilter, statusFilter]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleCreateGroup = async () => {
    setActionLoading(true);
    try {
      await adminGroupsApi.createGroup(formData);
      setShowCreateModal(false);
      resetForm();
      fetchGroups();
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroup) return;

    setActionLoading(true);
    try {
      await adminGroupsApi.updateGroup(selectedGroup.id, formData);
      setShowEditModal(false);
      setSelectedGroup(null);
      resetForm();
      fetchGroups();
    } catch (error) {
      console.error('Failed to update group:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    setActionLoading(true);
    try {
      await adminGroupsApi.deleteGroup(selectedGroup.id);
      setShowDeleteModal(false);
      setSelectedGroup(null);
      fetchGroups();
    } catch (error) {
      console.error('Failed to delete group:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewStats = async (group: Group) => {
    setSelectedGroup(group);
    setShowStatsModal(true);
    setStatsLoading(true);
    try {
      const stats = await adminGroupsApi.getGroupStats(group.id);
      setGroupStats(stats);
    } catch (error) {
      console.error('Failed to fetch group stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const openEditModal = (group: Group) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description,
      platform: group.platform,
      rate_multiplier: group.rate_multiplier,
      is_exclusive: group.is_exclusive,
      status: group.status,
      subscription_type: group.subscription_type,
      daily_limit_usd: group.daily_limit_usd,
      weekly_limit_usd: group.weekly_limit_usd,
      monthly_limit_usd: group.monthly_limit_usd,
      user_concurrency: group.user_concurrency,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      platform: 'claude',
      rate_multiplier: 1,
      is_exclusive: false,
      status: 'active',
      subscription_type: 'none',
      daily_limit_usd: undefined,
      weekly_limit_usd: undefined,
      monthly_limit_usd: undefined,
      user_concurrency: 5,
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  const columns = [
    {
      key: 'id',
      title: 'ID',
      render: (group: Group) => (
        <span className="text-sm text-gray-400">#{group.id}</span>
      ),
    },
    {
      key: 'name',
      title: 'Name',
      render: (group: Group) => (
        <div>
          <p className="text-sm font-medium text-white">{group.name}</p>
          <p className="text-xs text-gray-500 truncate max-w-[200px]">
            {group.description || 'No description'}
          </p>
        </div>
      ),
    },
    {
      key: 'platform',
      title: 'Platform',
      render: (group: Group) => getPlatformBadge(group.platform),
    },
    {
      key: 'status',
      title: 'Status',
      render: (group: Group) => getStatusBadge(group.status),
    },
    {
      key: 'rate',
      title: 'Rate',
      render: (group: Group) => (
        <span className="text-sm text-cyan-400">{group.rate_multiplier}x</span>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      render: (group: Group) => (
        <Badge variant={group.is_exclusive ? 'primary' : 'default'}>
          {group.is_exclusive ? 'Exclusive' : 'Public'}
        </Badge>
      ),
    },
    {
      key: 'subscription',
      title: 'Subscription',
      render: (group: Group) => (
        <span className="text-sm text-gray-400 capitalize">
          {group.subscription_type || 'None'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (group: Group) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewStats(group)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-cyan-400 transition-colors"
            title="View Stats"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEditModal(group)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title="Edit Group"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedGroup(group);
              setShowDeleteModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-red-400 transition-colors"
            title="Delete Group"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const GroupForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm text-gray-400 mb-1">Name *</label>
          <Input
            placeholder="Group name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <Input
            placeholder="Group description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Platform</label>
          <select
            value={formData.platform}
            onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
            className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
          >
            <option value="claude">Claude</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
          >
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Rate Multiplier</label>
          <Input
            type="number"
            step="0.1"
            min="0.1"
            placeholder="1.0"
            value={formData.rate_multiplier}
            onChange={(e) => setFormData({ ...formData, rate_multiplier: parseFloat(e.target.value) || 1 })}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">User Concurrency</label>
          <Input
            type="number"
            min="1"
            placeholder="5"
            value={formData.user_concurrency}
            onChange={(e) => setFormData({ ...formData, user_concurrency: parseInt(e.target.value) || 5 })}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Subscription Type</label>
          <select
            value={formData.subscription_type}
            onChange={(e) => setFormData({ ...formData, subscription_type: e.target.value })}
            className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
          >
            <option value="none">None</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_exclusive"
            checked={formData.is_exclusive}
            onChange={(e) => setFormData({ ...formData, is_exclusive: e.target.checked })}
            className="w-4 h-4 rounded border-[#2A2A30] bg-[#0A0A0C] text-cyan-500 focus:ring-cyan-500"
          />
          <label htmlFor="is_exclusive" className="text-sm text-gray-400">
            Exclusive Group
          </label>
        </div>
      </div>

      {/* Limits */}
      <div className="border-t border-[#2A2A30] pt-4">
        <p className="text-sm text-gray-400 mb-3">Usage Limits (USD)</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Daily</label>
            <Input
              type="number"
              step="0.01"
              placeholder="No limit"
              value={formData.daily_limit_usd || ''}
              onChange={(e) => setFormData({ ...formData, daily_limit_usd: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Weekly</label>
            <Input
              type="number"
              step="0.01"
              placeholder="No limit"
              value={formData.weekly_limit_usd || ''}
              onChange={(e) => setFormData({ ...formData, weekly_limit_usd: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Monthly</label>
            <Input
              type="number"
              step="0.01"
              placeholder="No limit"
              value={formData.monthly_limit_usd || ''}
              onChange={(e) => setFormData({ ...formData, monthly_limit_usd: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          variant="secondary"
          onClick={() => {
            isEdit ? setShowEditModal(false) : setShowCreateModal(false);
            resetForm();
            setSelectedGroup(null);
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={isEdit ? handleUpdateGroup : handleCreateGroup}
          isLoading={actionLoading}
          disabled={!formData.name}
        >
          {isEdit ? 'Update Group' : 'Create Group'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Group Management</h1>
          <p className="text-gray-400">Manage API groups and their settings</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <select
              value={platformFilter}
              onChange={(e) => {
                setPlatformFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="">All Platforms</option>
              <option value="claude">Claude</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
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
              <option value="disabled">Disabled</option>
            </select>
            <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
              <Layers className="w-4 h-4" />
              <span>{total} total groups</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Groups Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={groups}
            loading={loading}
            emptyText="No groups found"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#2A2A30]">
              <p className="text-sm text-gray-400">
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, total)} of {total} groups
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
          resetForm();
        }}
        title="Create Group"
      >
        <GroupForm />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedGroup(null);
          resetForm();
        }}
        title="Edit Group"
      >
        <GroupForm isEdit />
      </Modal>

      {/* Stats Modal */}
      <Modal
        isOpen={showStatsModal}
        onClose={() => {
          setShowStatsModal(false);
          setSelectedGroup(null);
          setGroupStats(null);
        }}
        title={`Stats: ${selectedGroup?.name || ''}`}
      >
        {statsLoading ? (
          <div className="space-y-4">
            <Skeleton height={60} />
            <Skeleton height={60} />
            <Skeleton height={60} />
          </div>
        ) : groupStats ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-gray-500">Total Accounts</span>
              </div>
              <p className="text-xl font-bold text-white">{groupStats.total_accounts}</p>
              <p className="text-xs text-gray-500">{groupStats.active_accounts} active</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-500">Subscriptions</span>
              </div>
              <p className="text-xl font-bold text-white">{groupStats.active_subscriptions}</p>
              <p className="text-xs text-gray-500">active</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-gray-500">Today's Requests</span>
              </div>
              <p className="text-xl font-bold text-white">
                {groupStats.total_requests_today.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-gray-500">Today's Cost</span>
              </div>
              <p className="text-xl font-bold text-emerald-400">
                ${groupStats.total_cost_today.toFixed(2)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Failed to load stats</p>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedGroup(null);
        }}
        title="Delete Group"
      >
        {selectedGroup && (
          <div className="space-y-4">
            <p className="text-gray-400">
              Are you sure you want to delete group{' '}
              <span className="text-white font-medium">{selectedGroup.name}</span>?
            </p>
            <p className="text-sm text-red-400">
              This action cannot be undone. All associated accounts and subscriptions will be affected.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedGroup(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteGroup}
                isLoading={actionLoading}
              >
                Delete Group
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GroupsPage;
