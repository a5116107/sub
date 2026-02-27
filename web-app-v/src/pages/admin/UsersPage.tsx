import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Search,
  Filter,
  Edit,
  Trash2,
  DollarSign,
  Shield,
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { adminUsersApi, type UserQueryParams } from '../../api/admin/users';
import type { AdminUser } from '../../types';
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

type DetailTab = 'info' | 'keys' | 'subs' | 'usage';

interface UserApiKey {
  id: number;
  name: string;
  key: string;
  status: string;
  group_id?: number;
  group_name?: string;
  created_at: string;
}

interface UserSubscription {
  id: number;
  group_name: string;
  status: string;
  expires_at: string;
}

interface UserUsage {
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  daily_stats: Array<{
    date: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
}

const getStatusBadge = (status: string, t: (key: string) => string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return <Badge variant="success">{t('users.status.active')}</Badge>;
    case 'banned':
      return <Badge variant="danger">{t('users.status.banned')}</Badge>;
    case 'suspended':
      return <Badge variant="default">{t('users.status.suspended')}</Badge>;
    default:
      return <Badge variant="info">{status}</Badge>;
  }
};

const getRoleBadge = (role: string, t: (key: string) => string) => {
  switch (role.toLowerCase()) {
    case 'admin':
      return <Badge variant="primary">{t('users.role.admin')}</Badge>;
    case 'user':
      return <Badge variant="default">{t('users.role.user')}</Badge>;
    default:
      return <Badge variant="info">{role}</Badge>;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const UsersPage: React.FC = () => {
  const { t } = useTranslation('admin');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modal states
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Balance adjustment
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceReason, setBalanceReason] = useState('');

  // User attributes
  const [userAttributes, setUserAttributes] = useState<Array<{
    id: number;
    attribute_id: number;
    attribute_name: string;
    attribute_key: string;
    value: string;
    created_at: string;
    updated_at: string;
  }>>([]);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const [editedAttributes, setEditedAttributes] = useState<Record<number, string>>({});
  const [savingAttributes, setSavingAttributes] = useState(false);

  // Detail modal tabs
  const [detailTab, setDetailTab] = useState<DetailTab>('info');
  const [userApiKeys, setUserApiKeys] = useState<UserApiKey[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [userUsage, setUserUsage] = useState<UserUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: UserQueryParams = {
        page,
        page_size: pageSize,
      };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await adminUsersApi.getUsers(params);
      setUsers(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleToggleStatus = async (user: AdminUser) => {
    setActionLoading(true);
    try {
      const newStatus = user.status === 'active' ? 'banned' : 'active';
      await adminUsersApi.setUserStatus(user.id, newStatus);
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user status:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleRole = async (user: AdminUser) => {
    setActionLoading(true);
    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      await adminUsersApi.setUserRole(user.id, newRole);
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user role:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdjustBalance = async () => {
    if (!selectedUser || !balanceAmount) return;

    setActionLoading(true);
    try {
      await adminUsersApi.adjustBalance(selectedUser.id, {
        amount: parseFloat(balanceAmount),
        reason: balanceReason || 'Admin adjustment',
      });
      setShowBalanceModal(false);
      setBalanceAmount('');
      setBalanceReason('');
      fetchUsers();
    } catch (error) {
      console.error('Failed to adjust balance:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      await adminUsersApi.deleteUser(selectedUser.id);
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const fetchUserAttributes = useCallback(async (userId: number) => {
    setAttributesLoading(true);
    try {
      const attrs = await adminUsersApi.getUserAttributes(userId);
      setUserAttributes(Array.isArray(attrs) ? attrs : []);
      const initial: Record<number, string> = {};
      (Array.isArray(attrs) ? attrs : []).forEach((attr) => {
        initial[attr.attribute_id] = attr.value;
      });
      setEditedAttributes(initial);
    } catch (error) {
      console.error('Failed to fetch user attributes:', error);
      setUserAttributes([]);
    } finally {
      setAttributesLoading(false);
    }
  }, []);

  const handleSaveAttributes = async () => {
    if (!selectedUser) return;
    setSavingAttributes(true);
    try {
      const attributes = Object.entries(editedAttributes).map(([attrId, value]) => ({
        attribute_id: parseInt(attrId),
        value,
      }));
      await adminUsersApi.updateUserAttributes(selectedUser.id, { attributes });
      fetchUserAttributes(selectedUser.id);
    } catch (error) {
      console.error('Failed to save user attributes:', error);
    } finally {
      setSavingAttributes(false);
    }
  };

  const fetchUserApiKeys = useCallback(async (userId: number) => {
    setApiKeysLoading(true);
    try {
      const keys = await adminUsersApi.getUserApiKeys(userId);
      setUserApiKeys(Array.isArray(keys) ? keys : []);
    } catch (error) {
      console.error('Failed to fetch user API keys:', error);
      setUserApiKeys([]);
    } finally {
      setApiKeysLoading(false);
    }
  }, []);

  const fetchUserSubscriptions = useCallback(async (userId: number) => {
    setSubscriptionsLoading(true);
    try {
      const subs = await adminUsersApi.getUserSubscriptions(userId);
      setUserSubscriptions(Array.isArray(subs) ? subs : []);
    } catch (error) {
      console.error('Failed to fetch user subscriptions:', error);
      setUserSubscriptions([]);
    } finally {
      setSubscriptionsLoading(false);
    }
  }, []);

  const fetchUserUsage = useCallback(async (userId: number) => {
    setUsageLoading(true);
    try {
      const usage = await adminUsersApi.getUserUsage(userId);
      setUserUsage(usage);
    } catch (error) {
      console.error('Failed to fetch user usage:', error);
      setUserUsage(null);
    } finally {
      setUsageLoading(false);
    }
  }, []);

  const handleDetailTabChange = useCallback((tab: DetailTab) => {
    setDetailTab(tab);
    if (!selectedUser) return;
    switch (tab) {
      case 'keys':
        fetchUserApiKeys(selectedUser.id);
        break;
      case 'subs':
        fetchUserSubscriptions(selectedUser.id);
        break;
      case 'usage':
        fetchUserUsage(selectedUser.id);
        break;
    }
  }, [selectedUser, fetchUserApiKeys, fetchUserSubscriptions, fetchUserUsage]);

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 8) + '...';
  };

  const totalPages = Math.ceil(total / pageSize);

  const columns = [
    {
      key: 'id',
      title: t('users.col.id'),
      render: (user: AdminUser) => (
        <span className="text-sm text-gray-400">#{user.id}</span>
      ),
    },
    {
      key: 'user',
      title: t('users.col.user'),
      render: (user: AdminUser) => (
        <div>
          <p className="text-sm font-medium text-white">{user.username}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      title: t('users.col.role'),
      render: (user: AdminUser) => getRoleBadge(user.role, t),
    },
    {
      key: 'status',
      title: t('users.col.status'),
      render: (user: AdminUser) => getStatusBadge(user.status, t),
    },
    {
      key: 'balance',
      title: t('users.col.balance'),
      render: (user: AdminUser) => (
        <span className="text-sm font-medium text-emerald-400">
          ${user.balance.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'created_at',
      title: t('users.col.created'),
      render: (user: AdminUser) => (
        <span className="text-sm text-gray-400">{formatDate(user.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      title: t('users.col.actions'),
      render: (user: AdminUser) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedUser(user);
              setDetailTab('info');
              setShowDetailsModal(true);
              fetchUserAttributes(user.id);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title="View Details"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedUser(user);
              setShowBalanceModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-emerald-400 transition-colors"
            title="Adjust Balance"
          >
            <DollarSign className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToggleRole(user)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-purple-400 transition-colors"
            title={user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
            disabled={actionLoading}
          >
            <Shield className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToggleStatus(user)}
            className={`p-1.5 rounded hover:bg-[#2A2A30] transition-colors ${
              user.status === 'active'
                ? 'text-gray-400 hover:text-red-400'
                : 'text-gray-400 hover:text-green-400'
            }`}
            title={user.status === 'active' ? 'Ban User' : 'Unban User'}
            disabled={actionLoading}
          >
            {user.status === 'active' ? (
              <Ban className="w-4 h-4" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => {
              setSelectedUser(user);
              setShowDeleteModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-red-400 transition-colors"
            title="Delete User"
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
          <h1 className="text-2xl font-bold text-white mb-1">{t('users.title')}</h1>
          <p className="text-gray-400">{t('users.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Users className="w-4 h-4" />
          <span>{t('users.pagination.total', { total })}</span>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder={t('users.search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="">{t('users.filter.allRoles')}</option>
              <option value="user">{t('users.filter.user')}</option>
              <option value="admin">{t('users.filter.admin')}</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="">{t('users.filter.allStatus')}</option>
              <option value="active">{t('users.filter.active')}</option>
              <option value="banned">{t('users.filter.banned')}</option>
            </select>
            <Button type="submit" variant="secondary">
              <Filter className="w-4 h-4 mr-2" />
              {t('users.filter.filter')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={users}
            loading={loading}
            emptyText={t('users.empty')}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#2A2A30]">
              <p className="text-sm text-gray-400">
                {t('users.pagination.showing', { start: (page - 1) * pageSize + 1, end: Math.min(page * pageSize, total), total })}
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
                  {t('users.pagination.page', { current: page, total: totalPages })}
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

      {/* User Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedUser(null);
          setDetailTab('info');
        }}
        title={t('users.modal.userDetails')}
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-4">
            {/* Tab Buttons */}
            <div className="flex gap-1 border-b border-[#2A2A30] pb-0 -mt-2">
              {([
                { key: 'info' as DetailTab, label: t('users.tabs.info') },
                { key: 'keys' as DetailTab, label: t('users.tabs.apiKeys') },
                { key: 'subs' as DetailTab, label: t('users.tabs.subscriptions') },
                { key: 'usage' as DetailTab, label: t('users.tabs.usage') },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleDetailTabChange(tab.key)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    detailTab === tab.key
                      ? 'bg-[#2A2A30] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Info Tab */}
            {detailTab === 'info' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('users.detail.id')}</p>
                    <p className="text-sm text-white">#{selectedUser.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('users.detail.username')}</p>
                    <p className="text-sm text-white">{selectedUser.username}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('users.detail.email')}</p>
                    <p className="text-sm text-white">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('users.detail.role')}</p>
                    {getRoleBadge(selectedUser.role, t)}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('users.detail.status')}</p>
                    {getStatusBadge(selectedUser.status, t)}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('users.detail.balance')}</p>
                    <p className="text-sm font-medium text-emerald-400">
                      ${selectedUser.balance.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('users.detail.concurrency')}</p>
                    <p className="text-sm text-white">{selectedUser.concurrency}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('users.detail.created')}</p>
                    <p className="text-sm text-white">{formatDate(selectedUser.created_at)}</p>
                  </div>
                </div>
                {selectedUser.allowed_groups && selectedUser.allowed_groups.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">{t('users.detail.allowedGroups')}</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.allowed_groups.map((groupId) => (
                        <Badge key={groupId} variant="info">
                          Group #{groupId}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {/* User Attributes */}
                <div className="border-t border-[#2A2A30] pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-white">{t('users.detail.attributes')}</p>
                    {userAttributes.length > 0 && (
                      <Button size="sm" onClick={handleSaveAttributes} isLoading={savingAttributes}>
                        {t('users.btn.saveAttributes')}
                      </Button>
                    )}
                  </div>
                  {attributesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    </div>
                  ) : userAttributes.length > 0 ? (
                    <div className="space-y-3">
                      {userAttributes.map((attr) => (
                        <div key={attr.attribute_id}>
                          <label className="block text-xs text-gray-500 mb-1">
                            {attr.attribute_name} <span className="text-gray-600">({attr.attribute_key})</span>
                          </label>
                          <Input
                            value={editedAttributes[attr.attribute_id] ?? attr.value}
                            onChange={(e) => setEditedAttributes({
                              ...editedAttributes,
                              [attr.attribute_id]: e.target.value,
                            })}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">{t('users.detail.noAttributes')}</p>
                  )}
                </div>
              </div>
            )}

            {/* API Keys Tab */}
            {detailTab === 'keys' && (
              <div>
                {apiKeysLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-4">
                        <Skeleton height={16} width="25%" />
                        <Skeleton height={16} width="30%" />
                        <Skeleton height={16} width="15%" />
                        <Skeleton height={16} width="20%" />
                      </div>
                    ))}
                  </div>
                ) : userApiKeys.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#2A2A30]">
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">{t('users.apiKeys.name')}</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">{t('users.apiKeys.key')}</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">{t('users.apiKeys.status')}</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">{t('users.apiKeys.group')}</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">{t('users.apiKeys.created')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userApiKeys.map((apiKey) => (
                          <tr key={apiKey.id} className="border-b border-[#2A2A30]/50">
                            <td className="py-2 px-3 text-white">{apiKey.name}</td>
                            <td className="py-2 px-3">
                              <code className="text-xs bg-[#0A0A0C] px-2 py-1 rounded text-gray-400 font-mono">
                                {maskApiKey(apiKey.key)}
                              </code>
                            </td>
                            <td className="py-2 px-3">{getStatusBadge(apiKey.status, t)}</td>
                            <td className="py-2 px-3 text-gray-400">{apiKey.group_name || '-'}</td>
                            <td className="py-2 px-3 text-gray-400">{formatDate(apiKey.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">{t('users.apiKeys.empty')}</p>
                )}
              </div>
            )}

            {/* Subscriptions Tab */}
            {detailTab === 'subs' && (
              <div>
                {subscriptionsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-4">
                        <Skeleton height={16} width="30%" />
                        <Skeleton height={16} width="20%" />
                        <Skeleton height={16} width="30%" />
                      </div>
                    ))}
                  </div>
                ) : userSubscriptions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#2A2A30]">
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">{t('users.subs.group')}</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">{t('users.subs.status')}</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">{t('users.subs.expires')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userSubscriptions.map((sub) => (
                          <tr key={sub.id} className="border-b border-[#2A2A30]/50">
                            <td className="py-2 px-3 text-white">{sub.group_name}</td>
                            <td className="py-2 px-3">{getStatusBadge(sub.status, t)}</td>
                            <td className="py-2 px-3 text-gray-400">{formatDate(sub.expires_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">{t('users.subs.empty')}</p>
                )}
              </div>
            )}

            {/* Usage Tab */}
            {detailTab === 'usage' && (
              <div>
                {usageLoading ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-[#0A0A0C] border border-[#2A2A30] rounded-xl p-4">
                          <Skeleton height={12} width="60%" className="mb-2" />
                          <Skeleton height={24} width="80%" />
                        </div>
                      ))}
                    </div>
                    <Skeleton height={16} width="100%" />
                    <Skeleton height={16} width="100%" />
                  </div>
                ) : userUsage ? (
                  <div className="space-y-4">
                    {/* Stat Cards */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-[#0A0A0C] border border-[#2A2A30] rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1">{t('users.usage.totalRequests')}</p>
                        <p className="text-lg font-semibold text-white">{userUsage.total_requests.toLocaleString()}</p>
                      </div>
                      <div className="bg-[#0A0A0C] border border-[#2A2A30] rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1">{t('users.usage.totalTokens')}</p>
                        <p className="text-lg font-semibold text-white">{userUsage.total_tokens.toLocaleString()}</p>
                      </div>
                      <div className="bg-[#0A0A0C] border border-[#2A2A30] rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1">{t('users.usage.totalCost')}</p>
                        <p className="text-lg font-semibold text-emerald-400">${userUsage.total_cost.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Daily Stats Table */}
                    {userUsage.daily_stats && userUsage.daily_stats.length > 0 ? (
                      <div>
                        <p className="text-sm font-medium text-white mb-2">{t('users.usage.dailyStats')}</p>
                        <div className="overflow-x-auto max-h-64 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-[#121215]">
                              <tr className="border-b border-[#2A2A30]">
                                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">{t('users.usage.date')}</th>
                                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">{t('users.usage.requests')}</th>
                                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">{t('users.usage.tokens')}</th>
                                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">{t('users.usage.cost')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {userUsage.daily_stats.map((day) => (
                                <tr key={day.date} className="border-b border-[#2A2A30]/50">
                                  <td className="py-2 px-3 text-white">{day.date}</td>
                                  <td className="py-2 px-3 text-gray-400 text-right">{day.requests.toLocaleString()}</td>
                                  <td className="py-2 px-3 text-gray-400 text-right">{day.tokens.toLocaleString()}</td>
                                  <td className="py-2 px-3 text-emerald-400 text-right">${day.cost.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">{t('users.usage.noDailyStats')}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">{t('users.usage.noData')}</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Balance Adjustment Modal */}
      <Modal
        isOpen={showBalanceModal}
        onClose={() => {
          setShowBalanceModal(false);
          setSelectedUser(null);
          setBalanceAmount('');
          setBalanceReason('');
        }}
        title={t('users.modal.adjustBalance')}
      >
        {selectedUser && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              {t('users.modal.adjustingFor')} <span className="text-white">{selectedUser.username}</span>
            </p>
            <p className="text-sm text-gray-400">
              {t('users.modal.currentBalance')}{' '}
              <span className="text-emerald-400">${selectedUser.balance.toFixed(2)}</span>
            </p>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {t('users.modal.amountLabel')}
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="10.00"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('users.modal.reasonLabel')}</label>
              <Input
                placeholder={t('users.modal.reasonPlaceholder')}
                value={balanceReason}
                onChange={(e) => setBalanceReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowBalanceModal(false);
                  setBalanceAmount('');
                  setBalanceReason('');
                }}
              >
                {t('common:btn.cancel')}
              </Button>
              <Button
                onClick={handleAdjustBalance}
                isLoading={actionLoading}
                disabled={!balanceAmount}
              >
                {t('users.btn.adjustBalance')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        title={t('users.modal.deleteUser')}
      >
        {selectedUser && (
          <div className="space-y-4">
            <p className="text-gray-400">
              {t('users.modal.deleteConfirmText')}{' '}
              <span className="text-white font-medium">{selectedUser.username}</span>?
            </p>
            <p className="text-sm text-red-400">
              {t('users.modal.deleteWarning')}
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
              >
                {t('common:btn.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteUser}
                isLoading={actionLoading}
              >
                {t('users.btn.deleteUser')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UsersPage;
