import React, { useEffect, useState, useCallback } from 'react';
import {
  Server,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Play,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { adminAccountsApi, type AccountQueryParams } from '../../api/admin/accounts';
import type { Account } from '../../types';
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
    case 'disabled':
      return <Badge variant="default">Disabled</Badge>;
    case 'error':
      return <Badge variant="danger">Error</Badge>;
    case 'rate_limited':
      return <Badge variant="default">Rate Limited</Badge>;
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

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const AccountsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modal states
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [refreshResult, setRefreshResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Account>>({
    name: '',
    notes: '',
    platform: 'claude',
    type: 'api_key',
    credentials: {},
    extra: {},
    concurrency: 5,
    priority: 0,
    rate_multiplier: 1,
    status: 'active',
    auto_pause_on_expired: true,
  });

  // Credentials form
  const [credentialsJson, setCredentialsJson] = useState('{}');

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params: AccountQueryParams = {
        page,
        page_size: pageSize,
      };
      if (platformFilter) params.platform = platformFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await adminAccountsApi.getAccounts(params);
      setAccounts(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, platformFilter, statusFilter]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleCreateAccount = async () => {
    setActionLoading(true);
    try {
      let credentials = {};
      try {
        credentials = JSON.parse(credentialsJson);
      } catch {
        console.error('Invalid credentials JSON');
        return;
      }

      await adminAccountsApi.createAccount({
        ...formData,
        credentials,
      });
      setShowCreateModal(false);
      resetForm();
      fetchAccounts();
    } catch (error) {
      console.error('Failed to create account:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateAccount = async () => {
    if (!selectedAccount) return;

    setActionLoading(true);
    try {
      let credentials = {};
      try {
        credentials = JSON.parse(credentialsJson);
      } catch {
        console.error('Invalid credentials JSON');
        return;
      }

      await adminAccountsApi.updateAccount(selectedAccount.id, {
        ...formData,
        credentials,
      });
      setShowEditModal(false);
      setSelectedAccount(null);
      resetForm();
      fetchAccounts();
    } catch (error) {
      console.error('Failed to update account:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccount) return;

    setActionLoading(true);
    try {
      await adminAccountsApi.deleteAccount(selectedAccount.id);
      setShowDeleteModal(false);
      setSelectedAccount(null);
      fetchAccounts();
    } catch (error) {
      console.error('Failed to delete account:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestAccount = async (account: Account) => {
    setSelectedAccount(account);
    setTestResult(null);
    setActionLoading(true);
    try {
      const result = await adminAccountsApi.testAccount(account.id);
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, message: 'Test failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefreshAccount = async (account: Account) => {
    setSelectedAccount(account);
    setRefreshResult(null);
    setActionLoading(true);
    try {
      const result = await adminAccountsApi.refreshAccount(account.id);
      setRefreshResult(result);
      fetchAccounts();
    } catch (error) {
      setRefreshResult({ success: false, message: 'Refresh failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearError = async (account: Account) => {
    setActionLoading(true);
    try {
      await adminAccountsApi.setAccountStatus(account.id, 'active');
      fetchAccounts();
    } catch (error) {
      console.error('Failed to clear error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (account: Account) => {
    setSelectedAccount(account);
    setFormData({
      name: account.name,
      notes: account.notes,
      platform: account.platform,
      type: account.type,
      concurrency: account.concurrency,
      priority: account.priority,
      rate_multiplier: account.rate_multiplier,
      status: account.status,
      auto_pause_on_expired: account.auto_pause_on_expired,
    });
    setCredentialsJson(JSON.stringify(account.credentials || {}, null, 2));
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      notes: '',
      platform: 'claude',
      type: 'api_key',
      credentials: {},
      extra: {},
      concurrency: 5,
      priority: 0,
      rate_multiplier: 1,
      status: 'active',
      auto_pause_on_expired: true,
    });
    setCredentialsJson('{}');
  };

  const totalPages = Math.ceil(total / pageSize);

  const columns = [
    {
      key: 'id',
      title: 'ID',
      render: (account: Account) => (
        <span className="text-sm text-gray-400">#{account.id}</span>
      ),
    },
    {
      key: 'name',
      title: 'Name',
      render: (account: Account) => (
        <div>
          <p className="text-sm font-medium text-white">{account.name}</p>
          {account.notes && (
            <p className="text-xs text-gray-500 truncate max-w-[150px]">{account.notes}</p>
          )}
        </div>
      ),
    },
    {
      key: 'platform',
      title: 'Platform',
      render: (account: Account) => getPlatformBadge(account.platform),
    },
    {
      key: 'type',
      title: 'Type',
      render: (account: Account) => (
        <span className="text-sm text-gray-400 capitalize">{account.type.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (account: Account) => (
        <div>
          {getStatusBadge(account.status)}
          {account.error_message && (
            <p className="text-xs text-red-400 mt-1 truncate max-w-[150px]" title={account.error_message}>
              {account.error_message}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'concurrency',
      title: 'Concurrency',
      render: (account: Account) => (
        <span className="text-sm text-cyan-400">{account.concurrency}</span>
      ),
    },
    {
      key: 'last_used',
      title: 'Last Used',
      render: (account: Account) => (
        <span className="text-sm text-gray-400">{formatDate(account.last_used_at)}</span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (account: Account) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleTestAccount(account)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-emerald-400 transition-colors"
            title="Test Account"
            disabled={actionLoading}
          >
            <Play className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleRefreshAccount(account)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-cyan-400 transition-colors"
            title="Refresh Token"
            disabled={actionLoading}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {account.status === 'error' && (
            <button
              onClick={() => handleClearError(account)}
              className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-amber-400 transition-colors"
              title="Clear Error"
              disabled={actionLoading}
            >
              <AlertCircle className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => openEditModal(account)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title="Edit Account"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedAccount(account);
              setShowDeleteModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-red-400 transition-colors"
            title="Delete Account"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const AccountForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm text-gray-400 mb-1">Name *</label>
          <Input
            placeholder="Account name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-gray-400 mb-1">Notes</label>
          <Input
            placeholder="Optional notes"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
          <label className="block text-sm text-gray-400 mb-1">Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
          >
            <option value="api_key">API Key</option>
            <option value="oauth">OAuth</option>
            <option value="session">Session</option>
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
          <label className="block text-sm text-gray-400 mb-1">Concurrency</label>
          <Input
            type="number"
            min="1"
            placeholder="5"
            value={formData.concurrency}
            onChange={(e) => setFormData({ ...formData, concurrency: parseInt(e.target.value) || 5 })}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Priority</label>
          <Input
            type="number"
            placeholder="0"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
          />
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
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="auto_pause"
            checked={formData.auto_pause_on_expired}
            onChange={(e) => setFormData({ ...formData, auto_pause_on_expired: e.target.checked })}
            className="w-4 h-4 rounded border-[#2A2A30] bg-[#0A0A0C] text-cyan-500 focus:ring-cyan-500"
          />
          <label htmlFor="auto_pause" className="text-sm text-gray-400">
            Auto-pause on expired
          </label>
        </div>
      </div>

      {/* Credentials */}
      <div className="border-t border-[#2A2A30] pt-4">
        <label className="block text-sm text-gray-400 mb-2">Credentials (JSON)</label>
        <textarea
          value={credentialsJson}
          onChange={(e) => setCredentialsJson(e.target.value)}
          className="w-full h-32 bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-[#00F0FF] outline-none resize-none"
          placeholder='{"api_key": "sk-..."}'
        />
        <p className="text-xs text-gray-500 mt-1">
          Enter credentials as JSON. For API keys: {`{"api_key": "..."}`}
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          variant="secondary"
          onClick={() => {
            isEdit ? setShowEditModal(false) : setShowCreateModal(false);
            resetForm();
            setSelectedAccount(null);
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={isEdit ? handleUpdateAccount : handleCreateAccount}
          isLoading={actionLoading}
          disabled={!formData.name}
        >
          {isEdit ? 'Update Account' : 'Create Account'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Account Management</h1>
          <p className="text-gray-400">Manage platform accounts and credentials</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Account
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
              <option value="error">Error</option>
            </select>
            <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
              <Server className="w-4 h-4" />
              <span>{total} total accounts</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={accounts}
            loading={loading}
            emptyText="No accounts found"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#2A2A30]">
              <p className="text-sm text-gray-400">
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, total)} of {total} accounts
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

      {/* Test Result Toast */}
      {testResult && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
              testResult.success
                ? 'bg-emerald-500/20 border border-emerald-500/30'
                : 'bg-red-500/20 border border-red-500/30'
            }`}
          >
            {testResult.success ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <div>
              <p className={`text-sm font-medium ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {testResult.success ? 'Test Passed' : 'Test Failed'}
              </p>
              <p className="text-xs text-gray-400">{testResult.message}</p>
            </div>
            <button
              onClick={() => setTestResult(null)}
              className="ml-2 text-gray-400 hover:text-white"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Refresh Result Toast */}
      {refreshResult && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
              refreshResult.success
                ? 'bg-emerald-500/20 border border-emerald-500/30'
                : 'bg-red-500/20 border border-red-500/30'
            }`}
          >
            {refreshResult.success ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <div>
              <p className={`text-sm font-medium ${refreshResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {refreshResult.success ? 'Refresh Successful' : 'Refresh Failed'}
              </p>
              <p className="text-xs text-gray-400">{refreshResult.message}</p>
            </div>
            <button
              onClick={() => setRefreshResult(null)}
              className="ml-2 text-gray-400 hover:text-white"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Add Account"
      >
        <AccountForm />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedAccount(null);
          resetForm();
        }}
        title="Edit Account"
      >
        <AccountForm isEdit />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedAccount(null);
        }}
        title="Delete Account"
      >
        {selectedAccount && (
          <div className="space-y-4">
            <p className="text-gray-400">
              Are you sure you want to delete account{' '}
              <span className="text-white font-medium">{selectedAccount.name}</span>?
            </p>
            <p className="text-sm text-red-400">
              This action cannot be undone. The account will be permanently removed.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAccount(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteAccount}
                isLoading={actionLoading}
              >
                Delete Account
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AccountsPage;
