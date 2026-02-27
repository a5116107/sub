import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  Box,
  Key,
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

const getStatusBadge = (status: string, t: (key: string) => string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return <Badge variant="success">{t('groups.status.active')}</Badge>;
    case 'disabled':
      return <Badge variant="danger">{t('groups.status.disabled')}</Badge>;
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
  const { t } = useTranslation('admin');
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
  const [showModelsModal, setShowModelsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [groupStats, setGroupStats] = useState<GroupStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [groupModels, setGroupModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsText, setModelsText] = useState('');
  const [statsTab, setStatsTab] = useState<'stats' | 'apikeys' | 'subscriptions'>('stats');
  const [groupApiKeys, setGroupApiKeys] = useState<Array<{ id: number; name: string; key: string; status: string; user_id: number; user_email: string; created_at: string }>>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [groupSubscriptions, setGroupSubscriptions] = useState<Array<{ id: number; user_id: number; user_email: string; status: string; expires_at: string }>>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);

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
    setStatsTab('stats');
    setGroupApiKeys([]);
    setGroupSubscriptions([]);
    try {
      const stats = await adminGroupsApi.getGroupStats(group.id);
      setGroupStats(stats);
    } catch (error) {
      console.error('Failed to fetch group stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleFetchApiKeys = async (groupId: number) => {
    setApiKeysLoading(true);
    try {
      const keys = await adminGroupsApi.getGroupApiKeys(groupId);
      setGroupApiKeys(keys);
    } catch (error) {
      console.error('Failed to fetch group API keys:', error);
    } finally {
      setApiKeysLoading(false);
    }
  };

  const handleFetchSubscriptions = async (groupId: number) => {
    setSubscriptionsLoading(true);
    try {
      const subs = await adminGroupsApi.getGroupSubscriptions(groupId);
      setGroupSubscriptions(subs);
    } catch (error) {
      console.error('Failed to fetch group subscriptions:', error);
    } finally {
      setSubscriptionsLoading(false);
    }
  };

  const handleStatsTabChange = (tab: 'stats' | 'apikeys' | 'subscriptions') => {
    setStatsTab(tab);
    if (selectedGroup) {
      if (tab === 'apikeys' && groupApiKeys.length === 0) {
        handleFetchApiKeys(selectedGroup.id);
      } else if (tab === 'subscriptions' && groupSubscriptions.length === 0) {
        handleFetchSubscriptions(selectedGroup.id);
      }
    }
  };

  const handleViewModels = async (group: Group) => {
    setSelectedGroup(group);
    setShowModelsModal(true);
    setModelsLoading(true);
    try {
      const models = await adminGroupsApi.getGroupModels(group.id);
      const modelsList = Array.isArray(models) ? models : [];
      setGroupModels(modelsList);
      setModelsText(modelsList.join('\n'));
    } catch (error) {
      console.error('Failed to fetch group models:', error);
      setGroupModels([]);
      setModelsText('');
    } finally {
      setModelsLoading(false);
    }
  };

  const handleSaveModels = async () => {
    if (!selectedGroup) return;
    setActionLoading(true);
    try {
      const models = modelsText.split('\n').map(s => s.trim()).filter(Boolean);
      await adminGroupsApi.setGroupModels(selectedGroup.id, models);
      setGroupModels(models);
      setShowModelsModal(false);
      setSelectedGroup(null);
    } catch (error) {
      console.error('Failed to save group models:', error);
    } finally {
      setActionLoading(false);
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
      title: t('groups.col.id'),
      render: (group: Group) => (
        <span className="text-sm text-gray-400">#{group.id}</span>
      ),
    },
    {
      key: 'name',
      title: t('groups.col.name'),
      render: (group: Group) => (
        <div>
          <p className="text-sm font-medium text-white">{group.name}</p>
          <p className="text-xs text-gray-500 truncate max-w-[200px]">
            {group.description || t('groups.noDescription')}
          </p>
        </div>
      ),
    },
    {
      key: 'platform',
      title: t('groups.col.platform'),
      render: (group: Group) => getPlatformBadge(group.platform),
    },
    {
      key: 'status',
      title: t('groups.col.status'),
      render: (group: Group) => getStatusBadge(group.status, t),
    },
    {
      key: 'rate',
      title: t('groups.col.rate'),
      render: (group: Group) => (
        <span className="text-sm text-cyan-400">{group.rate_multiplier}x</span>
      ),
    },
    {
      key: 'type',
      title: t('groups.col.type'),
      render: (group: Group) => (
        <Badge variant={group.is_exclusive ? 'primary' : 'default'}>
          {group.is_exclusive ? t('groups.type.exclusive') : t('groups.type.public')}
        </Badge>
      ),
    },
    {
      key: 'subscription',
      title: t('groups.col.subscription'),
      render: (group: Group) => (
        <span className="text-sm text-gray-400 capitalize">
          {group.subscription_type || t('groups.subscription.none')}
        </span>
      ),
    },
    {
      key: 'actions',
      title: t('groups.col.actions'),
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
            onClick={() => handleViewModels(group)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-emerald-400 transition-colors"
            title="Manage Models"
          >
            <Box className="w-4 h-4" />
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
          <label className="block text-sm text-gray-400 mb-1">{t('groups.form.name')}</label>
          <Input
            placeholder={t('groups.form.namePlaceholder')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-gray-400 mb-1">{t('groups.form.description')}</label>
          <Input
            placeholder={t('groups.form.descriptionPlaceholder')}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('groups.form.platform')}</label>
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
          <label className="block text-sm text-gray-400 mb-1">{t('groups.form.status')}</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
          >
            <option value="active">{t('groups.status.active')}</option>
            <option value="disabled">{t('groups.status.disabled')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('groups.form.rateMultiplier')}</label>
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
          <label className="block text-sm text-gray-400 mb-1">{t('groups.form.userConcurrency')}</label>
          <Input
            type="number"
            min="1"
            placeholder="5"
            value={formData.user_concurrency}
            onChange={(e) => setFormData({ ...formData, user_concurrency: parseInt(e.target.value) || 5 })}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('groups.form.subscriptionType')}</label>
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
            {t('groups.form.exclusiveGroup')}
          </label>
        </div>
      </div>

      {/* Limits */}
      <div className="border-t border-[#2A2A30] pt-4">
        <p className="text-sm text-gray-400 mb-3">{t('groups.form.usageLimits')}</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('groups.form.daily')}</label>
            <Input
              type="number"
              step="0.01"
              placeholder={t('groups.form.noLimit')}
              value={formData.daily_limit_usd || ''}
              onChange={(e) => setFormData({ ...formData, daily_limit_usd: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('groups.form.weekly')}</label>
            <Input
              type="number"
              step="0.01"
              placeholder={t('groups.form.noLimit')}
              value={formData.weekly_limit_usd || ''}
              onChange={(e) => setFormData({ ...formData, weekly_limit_usd: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('groups.form.monthly')}</label>
            <Input
              type="number"
              step="0.01"
              placeholder={t('groups.form.noLimit')}
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
            if (isEdit) {
              setShowEditModal(false);
            } else {
              setShowCreateModal(false);
            }
            resetForm();
            setSelectedGroup(null);
          }}
        >
          {t('common:btn.cancel')}
        </Button>
        <Button
          onClick={isEdit ? handleUpdateGroup : handleCreateGroup}
          isLoading={actionLoading}
          disabled={!formData.name}
        >
          {isEdit ? t('groups.btn.updateGroup') : t('groups.btn.createGroup')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{t('groups.title')}</h1>
          <p className="text-gray-400">{t('groups.subtitle')}</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('groups.addGroup')}
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
              <option value="">{t('groups.filter.allPlatforms')}</option>
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
              <option value="">{t('groups.filter.allStatus')}</option>
              <option value="active">{t('groups.status.active')}</option>
              <option value="disabled">{t('groups.status.disabled')}</option>
            </select>
            <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
              <Layers className="w-4 h-4" />
              <span>{t('groups.pagination.total', { total })}</span>
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
            emptyText={t('groups.empty')}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#2A2A30]">
              <p className="text-sm text-gray-400">
                {t('groups.pagination.showing', { start: (page - 1) * pageSize + 1, end: Math.min(page * pageSize, total), total })}
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
                  {t('groups.pagination.page', { current: page, total: totalPages })}
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
        title={t('groups.modal.createGroup')}
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
        title={t('groups.modal.editGroup')}
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
          setStatsTab('stats');
          setGroupApiKeys([]);
          setGroupSubscriptions([]);
        }}
        title={t('groups.modal.stats', { name: selectedGroup?.name || '' })}
      >
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 bg-[#0A0A0C] rounded-lg p-1">
          <button
            onClick={() => handleStatsTabChange('stats')}
            className={statsTab === 'stats' ? 'bg-[#2A2A30] text-white rounded-lg px-3 py-1.5 text-sm' : 'text-gray-400 hover:text-white px-3 py-1.5 text-sm'}
          >
            {t('groups.tab.stats')}
          </button>
          <button
            onClick={() => handleStatsTabChange('apikeys')}
            className={statsTab === 'apikeys' ? 'bg-[#2A2A30] text-white rounded-lg px-3 py-1.5 text-sm' : 'text-gray-400 hover:text-white px-3 py-1.5 text-sm'}
          >
            <span className="flex items-center gap-1.5"><Key className="w-3.5 h-3.5" />{t('groups.tab.apiKeys')}</span>
          </button>
          <button
            onClick={() => handleStatsTabChange('subscriptions')}
            className={statsTab === 'subscriptions' ? 'bg-[#2A2A30] text-white rounded-lg px-3 py-1.5 text-sm' : 'text-gray-400 hover:text-white px-3 py-1.5 text-sm'}
          >
            <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{t('groups.tab.subscriptions')}</span>
          </button>
        </div>

        {/* Stats Tab */}
        {statsTab === 'stats' && (
          <>
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
                    <span className="text-xs text-gray-500">{t('groups.modal.totalAccounts')}</span>
                  </div>
                  <p className="text-xl font-bold text-white">{groupStats.total_accounts}</p>
                  <p className="text-xs text-gray-500">{groupStats.active_accounts} {t('groups.modal.active')}</p>
                </div>
                <div className="p-4 bg-[#0A0A0C] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-gray-500">{t('groups.modal.subscriptions')}</span>
                  </div>
                  <p className="text-xl font-bold text-white">{groupStats.active_subscriptions}</p>
                  <p className="text-xs text-gray-500">{t('groups.modal.active')}</p>
                </div>
                <div className="p-4 bg-[#0A0A0C] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-gray-500">{t('groups.modal.todaysRequests')}</span>
                  </div>
                  <p className="text-xl font-bold text-white">
                    {groupStats.total_requests_today.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-[#0A0A0C] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-gray-500">{t('groups.modal.todaysCost')}</span>
                  </div>
                  <p className="text-xl font-bold text-emerald-400">
                    ${groupStats.total_cost_today.toFixed(2)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">{t('groups.modal.failedToLoadStats')}</p>
            )}
          </>
        )}

        {/* API Keys Tab */}
        {statsTab === 'apikeys' && (
          <>
            {apiKeysLoading ? (
              <div className="space-y-4">
                <Skeleton height={40} />
                <Skeleton height={40} />
                <Skeleton height={40} />
              </div>
            ) : groupApiKeys.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-[#121215]">
                    <tr className="border-b border-[#2A2A30]">
                      <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">{t('groups.apiKeys.col.name')}</th>
                      <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">{t('groups.apiKeys.col.key')}</th>
                      <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">{t('groups.apiKeys.col.userEmail')}</th>
                      <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">{t('groups.apiKeys.col.status')}</th>
                      <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">{t('groups.apiKeys.col.created')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupApiKeys.map((key) => (
                      <tr key={key.id} className="border-b border-[#2A2A30]/50">
                        <td className="py-2 px-3 text-sm text-white">{key.name}</td>
                        <td className="py-2 px-3">
                          <code className="text-xs font-mono text-gray-400">
                            {key.key.substring(0, 8)}...{key.key.substring(key.key.length - 4)}
                          </code>
                        </td>
                        <td className="py-2 px-3 text-sm text-gray-400">{key.user_email}</td>
                        <td className="py-2 px-3">{getStatusBadge(key.status, t)}</td>
                        <td className="py-2 px-3 text-sm text-gray-400">
                          {new Date(key.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">{t('groups.apiKeys.empty')}</p>
            )}
          </>
        )}

        {/* Subscriptions Tab */}
        {statsTab === 'subscriptions' && (
          <>
            {subscriptionsLoading ? (
              <div className="space-y-4">
                <Skeleton height={40} />
                <Skeleton height={40} />
                <Skeleton height={40} />
              </div>
            ) : groupSubscriptions.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-[#121215]">
                    <tr className="border-b border-[#2A2A30]">
                      <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">{t('groups.subscriptions.col.userEmail')}</th>
                      <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">{t('groups.subscriptions.col.status')}</th>
                      <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">{t('groups.subscriptions.col.expiresAt')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupSubscriptions.map((sub) => (
                      <tr key={sub.id} className="border-b border-[#2A2A30]/50">
                        <td className="py-2 px-3 text-sm text-white">{sub.user_email}</td>
                        <td className="py-2 px-3">{getStatusBadge(sub.status, t)}</td>
                        <td className="py-2 px-3 text-sm text-gray-400">
                          {new Date(sub.expires_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">{t('groups.subscriptions.empty')}</p>
            )}
          </>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedGroup(null);
        }}
        title={t('groups.modal.deleteGroup')}
      >
        {selectedGroup && (
          <div className="space-y-4">
            <p className="text-gray-400">
              {t('groups.modal.deleteConfirmText')}{' '}
              <span className="text-white font-medium">{selectedGroup.name}</span>?
            </p>
            <p className="text-sm text-red-400">
              {t('groups.modal.deleteWarning')}
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedGroup(null);
                }}
              >
                {t('common:btn.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteGroup}
                isLoading={actionLoading}
              >
                {t('groups.btn.deleteGroup')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Models Management Modal */}
      <Modal
        isOpen={showModelsModal}
        onClose={() => {
          setShowModelsModal(false);
          setSelectedGroup(null);
          setGroupModels([]);
          setModelsText('');
        }}
        title={t('groups.modal.models', { name: selectedGroup?.name || '' })}
      >
        {modelsLoading ? (
          <div className="space-y-4">
            <Skeleton height={40} />
            <Skeleton height={120} />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400 mb-2">
                {t('groups.modal.assignModels')}
              </p>
              <p className="text-xs text-gray-500 mb-3">
                {t('groups.modal.currentModels', { count: groupModels.length })}
              </p>
              <textarea
                value={modelsText}
                onChange={(e) => setModelsText(e.target.value)}
                placeholder="claude-3-opus&#10;claude-3-sonnet&#10;gpt-4o"
                className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 outline-none resize-none h-48 font-mono"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowModelsModal(false);
                  setSelectedGroup(null);
                }}
              >
                {t('common:btn.cancel')}
              </Button>
              <Button
                onClick={handleSaveModels}
                isLoading={actionLoading}
              >
                {t('groups.btn.saveModels')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GroupsPage;
