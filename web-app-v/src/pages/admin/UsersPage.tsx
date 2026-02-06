import React, { useEffect, useState, useCallback } from 'react';
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
} from '../../components/ui';

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return <Badge variant="success">Active</Badge>;
    case 'banned':
      return <Badge variant="danger">Banned</Badge>;
    case 'suspended':
      return <Badge variant="default">Suspended</Badge>;
    default:
      return <Badge variant="info">{status}</Badge>;
  }
};

const getRoleBadge = (role: string) => {
  switch (role.toLowerCase()) {
    case 'admin':
      return <Badge variant="primary">Admin</Badge>;
    case 'user':
      return <Badge variant="default">User</Badge>;
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

  const totalPages = Math.ceil(total / pageSize);

  const columns = [
    {
      key: 'id',
      title: 'ID',
      render: (user: AdminUser) => (
        <span className="text-sm text-gray-400">#{user.id}</span>
      ),
    },
    {
      key: 'user',
      title: 'User',
      render: (user: AdminUser) => (
        <div>
          <p className="text-sm font-medium text-white">{user.username}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      title: 'Role',
      render: (user: AdminUser) => getRoleBadge(user.role),
    },
    {
      key: 'status',
      title: 'Status',
      render: (user: AdminUser) => getStatusBadge(user.status),
    },
    {
      key: 'balance',
      title: 'Balance',
      render: (user: AdminUser) => (
        <span className="text-sm font-medium text-emerald-400">
          ${user.balance.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'created_at',
      title: 'Created',
      render: (user: AdminUser) => (
        <span className="text-sm text-gray-400">{formatDate(user.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (user: AdminUser) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedUser(user);
              setShowDetailsModal(true);
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
          <h1 className="text-2xl font-bold text-white mb-1">User Management</h1>
          <p className="text-gray-400">Manage users, roles, and balances</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Users className="w-4 h-4" />
          <span>{total} total users</span>
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
                  placeholder="Search by email or username..."
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
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
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
              <option value="banned">Banned</option>
            </select>
            <Button type="submit" variant="secondary">
              <Filter className="w-4 h-4 mr-2" />
              Filter
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
            emptyText="No users found"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#2A2A30]">
              <p className="text-sm text-gray-400">
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, total)} of {total} users
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

      {/* User Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedUser(null);
        }}
        title="User Details"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">ID</p>
                <p className="text-sm text-white">#{selectedUser.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Username</p>
                <p className="text-sm text-white">{selectedUser.username}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="text-sm text-white">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Role</p>
                {getRoleBadge(selectedUser.role)}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                {getStatusBadge(selectedUser.status)}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Balance</p>
                <p className="text-sm font-medium text-emerald-400">
                  ${selectedUser.balance.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Concurrency</p>
                <p className="text-sm text-white">{selectedUser.concurrency}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Created</p>
                <p className="text-sm text-white">{formatDate(selectedUser.created_at)}</p>
              </div>
            </div>
            {selectedUser.allowed_groups && selectedUser.allowed_groups.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Allowed Groups</p>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.allowed_groups.map((groupId) => (
                    <Badge key={groupId} variant="info">
                      Group #{groupId}
                    </Badge>
                  ))}
                </div>
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
        title="Adjust Balance"
      >
        {selectedUser && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Adjusting balance for <span className="text-white">{selectedUser.username}</span>
            </p>
            <p className="text-sm text-gray-400">
              Current balance:{' '}
              <span className="text-emerald-400">${selectedUser.balance.toFixed(2)}</span>
            </p>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Amount (positive to add, negative to subtract)
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
              <label className="block text-sm text-gray-400 mb-1">Reason</label>
              <Input
                placeholder="Admin adjustment"
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
                Cancel
              </Button>
              <Button
                onClick={handleAdjustBalance}
                isLoading={actionLoading}
                disabled={!balanceAmount}
              >
                Adjust Balance
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
        title="Delete User"
      >
        {selectedUser && (
          <div className="space-y-4">
            <p className="text-gray-400">
              Are you sure you want to delete user{' '}
              <span className="text-white font-medium">{selectedUser.username}</span>?
            </p>
            <p className="text-sm text-red-400">
              This action cannot be undone. All user data will be permanently deleted.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteUser}
                isLoading={actionLoading}
              >
                Delete User
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UsersPage;
