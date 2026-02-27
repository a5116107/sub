import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  KeyRound,
  CloudCog,
  Eye,
  Zap,
  Upload,
  Star,
  Clock,
  BarChart3,
  Cpu,
  AlertTriangle,
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
import { OAuthWizardModal } from './components/OAuthWizardModal';

const getStatusBadge = (status: string, t: (key: string) => string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return <Badge variant="success">{t('accounts.status.active')}</Badge>;
    case 'disabled':
      return <Badge variant="default">{t('accounts.status.disabled')}</Badge>;
    case 'error':
      return <Badge variant="danger">{t('accounts.status.error')}</Badge>;
    case 'rate_limited':
      return <Badge variant="default">{t('accounts.status.rateLimited')}</Badge>;
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
  const { t } = useTranslation('admin');
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
  const [showOAuthWizard, setShowOAuthWizard] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced_count: number; message: string } | null>(null);

  // Detail modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailAccount, setDetailAccount] = useState<Account | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [todayStats, setTodayStats] = useState<{ requests: number; tokens: number; cost: number; errors: number } | null>(null);
  const [accountModels, setAccountModels] = useState<string[]>([]);
  const [tempUnschedulable, setTempUnschedulable] = useState<{ unschedulable_until: string | null } | null>(null);

  // Batch selection states
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Batch modals
  const [showBatchImportModal, setShowBatchImportModal] = useState(false);
  const [batchImportJson, setBatchImportJson] = useState('');
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState<{ status: string; concurrency: string; priority: string }>({ status: '', concurrency: '', priority: '' });
  const [showBatchCredentialsModal, setShowBatchCredentialsModal] = useState(false);
  const [batchCredentialsJson, setBatchCredentialsJson] = useState('{}');
  const [batchActionLoading, setBatchActionLoading] = useState(false);

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
    } catch {
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
    } catch {
      setRefreshResult({ success: false, message: 'Refresh failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearError = async (account: Account) => {
    setActionLoading(true);
    try {
      await adminAccountsApi.clearError(account.id);
      fetchAccounts();
    } catch (error) {
      console.error('Failed to clear error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearRateLimit = async (account: Account) => {
    setActionLoading(true);
    try {
      await adminAccountsApi.clearRateLimit(account.id);
      fetchAccounts();
    } catch (error) {
      console.error('Failed to clear rate limit:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefreshTier = async (account: Account) => {
    setActionLoading(true);
    try {
      await adminAccountsApi.refreshTier(account.id);
      fetchAccounts();
    } catch (error) {
      console.error('Failed to refresh tier:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Detail modal handler
  const openDetailModal = useCallback(async (account: Account) => {
    setDetailAccount(account);
    setShowDetailModal(true);
    setDetailLoading(true);
    setTodayStats(null);
    setAccountModels([]);
    setTempUnschedulable(null);
    try {
      const [stats, models, unschedulable] = await Promise.all([
        adminAccountsApi.getTodayStats(account.id).catch(() => null),
        adminAccountsApi.getModels(account.id).catch(() => []),
        adminAccountsApi.getTempUnschedulable(account.id).catch(() => null),
      ]);
      if (stats) setTodayStats(stats);
      if (models) setAccountModels(Array.isArray(models) ? models : []);
      if (unschedulable) setTempUnschedulable(unschedulable);
    } catch (error) {
      console.error('Failed to load account details:', error);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Batch selection helpers
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === accounts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(accounts.map((a) => a.id)));
    }
  }, [accounts, selectedIds.size]);

  const toggleSelectOne = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Batch operations
  const handleBatchRefreshTier = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBatchActionLoading(true);
    try {
      await adminAccountsApi.batchRefreshTier({ account_ids: Array.from(selectedIds) });
      setSelectedIds(new Set());
      fetchAccounts();
    } catch (error) {
      console.error('Failed to batch refresh tier:', error);
    } finally {
      setBatchActionLoading(false);
    }
  }, [selectedIds, fetchAccounts]);

  const handleBulkUpdate = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBatchActionLoading(true);
    try {
      const updates: Partial<Account> = {};
      if (bulkUpdateData.status) updates.status = bulkUpdateData.status;
      if (bulkUpdateData.concurrency) updates.concurrency = parseInt(bulkUpdateData.concurrency);
      if (bulkUpdateData.priority) updates.priority = parseInt(bulkUpdateData.priority);
      await adminAccountsApi.bulkUpdate({ account_ids: Array.from(selectedIds), updates });
      setShowBulkUpdateModal(false);
      setBulkUpdateData({ status: '', concurrency: '', priority: '' });
      setSelectedIds(new Set());
      fetchAccounts();
    } catch (error) {
      console.error('Failed to bulk update:', error);
    } finally {
      setBatchActionLoading(false);
    }
  }, [selectedIds, bulkUpdateData, fetchAccounts]);

  const handleBatchUpdateCredentials = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBatchActionLoading(true);
    try {
      let credentials = {};
      try {
        credentials = JSON.parse(batchCredentialsJson);
      } catch {
        console.error('Invalid credentials JSON');
        setBatchActionLoading(false);
        return;
      }
      await adminAccountsApi.batchUpdateCredentials({ account_ids: Array.from(selectedIds), credentials });
      setShowBatchCredentialsModal(false);
      setBatchCredentialsJson('{}');
      setSelectedIds(new Set());
      fetchAccounts();
    } catch (error) {
      console.error('Failed to batch update credentials:', error);
    } finally {
      setBatchActionLoading(false);
    }
  }, [selectedIds, batchCredentialsJson, fetchAccounts]);

  const handleBatchImport = useCallback(async () => {
    setBatchActionLoading(true);
    try {
      let accounts: Partial<Account>[] = [];
      try {
        accounts = JSON.parse(batchImportJson);
      } catch {
        console.error('Invalid JSON');
        setBatchActionLoading(false);
        return;
      }
      if (!Array.isArray(accounts)) {
        accounts = [accounts];
      }
      await adminAccountsApi.batchCreate({ accounts });
      setShowBatchImportModal(false);
      setBatchImportJson('');
      fetchAccounts();
    } catch (error) {
      console.error('Failed to batch import:', error);
    } finally {
      setBatchActionLoading(false);
    }
  }, [batchImportJson, fetchAccounts]);

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
      key: 'select',
      title: (
        <input
          type="checkbox"
          checked={accounts.length > 0 && selectedIds.size === accounts.length}
          onChange={toggleSelectAll}
          className="rounded border-[#2A2A30] bg-[#0A0A0C] text-cyan-500 focus:ring-cyan-500"
        />
      ) as unknown as string,
      width: '40px',
      render: (account: Account) => (
        <input
          type="checkbox"
          checked={selectedIds.has(account.id)}
          onChange={() => toggleSelectOne(account.id)}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-[#2A2A30] bg-[#0A0A0C] text-cyan-500 focus:ring-cyan-500"
        />
      ),
    },
    {
      key: 'id',
      title: t('accounts.col.id'),
      render: (account: Account) => (
        <span className="text-sm text-gray-400">#{account.id}</span>
      ),
    },
    {
      key: 'name',
      title: t('accounts.col.name'),
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
      title: t('accounts.col.platform'),
      render: (account: Account) => getPlatformBadge(account.platform),
    },
    {
      key: 'type',
      title: t('accounts.col.type'),
      render: (account: Account) => (
        <span className="text-sm text-gray-400 capitalize">{account.type.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'status',
      title: t('accounts.col.status'),
      render: (account: Account) => (
        <div>
          {getStatusBadge(account.status, t)}
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
      title: t('accounts.col.concurrency'),
      render: (account: Account) => (
        <span className="text-sm text-cyan-400">{account.concurrency}</span>
      ),
    },
    {
      key: 'last_used',
      title: t('accounts.col.lastUsed'),
      render: (account: Account) => (
        <span className="text-sm text-gray-400">{formatDate(account.last_used_at)}</span>
      ),
    },
    {
      key: 'actions',
      title: t('accounts.col.actions'),
      render: (account: Account) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openDetailModal(account)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-[#00F0FF] transition-colors"
            title={t('accounts.btn.viewDetail')}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleTestAccount(account)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-emerald-400 transition-colors"
            title={t('accounts.btn.testAccount')}
            disabled={actionLoading}
          >
            <Play className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleRefreshAccount(account)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-cyan-400 transition-colors"
            title={t('accounts.btn.refreshToken')}
            disabled={actionLoading}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleRefreshTier(account)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-purple-400 transition-colors"
            title={t('accounts.btn.refreshTier')}
            disabled={actionLoading}
          >
            <Star className="w-4 h-4" />
          </button>
          {account.status === 'error' && (
            <button
              onClick={() => handleClearError(account)}
              className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-amber-400 transition-colors"
              title={t('accounts.btn.clearError')}
              disabled={actionLoading}
            >
              <AlertCircle className="w-4 h-4" />
            </button>
          )}
          {account.status === 'rate_limited' && (
            <button
              onClick={() => handleClearRateLimit(account)}
              className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-orange-400 transition-colors"
              title={t('accounts.btn.clearRateLimit')}
              disabled={actionLoading}
            >
              <Zap className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => openEditModal(account)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title={t('accounts.editAccount')}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedAccount(account);
              setShowDeleteModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-red-400 transition-colors"
            title={t('accounts.deleteAccount')}
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
          <label className="block text-sm text-gray-400 mb-1">{t('accounts.form.name')}</label>
          <Input
            placeholder={t('accounts.form.namePlaceholder')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-gray-400 mb-1">{t('accounts.form.notes')}</label>
          <Input
            placeholder={t('accounts.form.notesPlaceholder')}
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('accounts.form.platform')}</label>
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
          <label className="block text-sm text-gray-400 mb-1">{t('accounts.form.type')}</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
          >
            <option value="api_key">{t('accounts.type.apiKey')}</option>
            <option value="oauth">{t('accounts.type.oauth')}</option>
            <option value="session">{t('accounts.type.session')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('accounts.form.status')}</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
          >
            <option value="active">{t('accounts.status.active')}</option>
            <option value="disabled">{t('accounts.status.disabled')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('accounts.form.concurrency')}</label>
          <Input
            type="number"
            min="1"
            placeholder="5"
            value={formData.concurrency}
            onChange={(e) => setFormData({ ...formData, concurrency: parseInt(e.target.value) || 5 })}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('accounts.form.priority')}</label>
          <Input
            type="number"
            placeholder="0"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('accounts.form.rateMultiplier')}</label>
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
            {t('accounts.form.autoPause')}
          </label>
        </div>
      </div>

      {/* Credentials */}
      <div className="border-t border-[#2A2A30] pt-4">
        <label className="block text-sm text-gray-400 mb-2">{t('accounts.form.credentials')}</label>
        <textarea
          value={credentialsJson}
          onChange={(e) => setCredentialsJson(e.target.value)}
          className="w-full h-32 bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-[#00F0FF] outline-none resize-none"
          placeholder='{"api_key": "sk-..."}'
        />
        <p className="text-xs text-gray-500 mt-1">
          {t('accounts.form.credentialsHint')} {`{"api_key": "..."}`}
        </p>
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
            setSelectedAccount(null);
          }}
        >
          {t('common:btn.cancel')}
        </Button>
        <Button
          onClick={isEdit ? handleUpdateAccount : handleCreateAccount}
          isLoading={actionLoading}
          disabled={!formData.name}
        >
          {isEdit ? t('accounts.btn.updateAccount') : t('accounts.btn.createAccount')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{t('accounts.title')}</h1>
          <p className="text-gray-400">{t('accounts.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={async () => {
              setSyncLoading(true);
              try {
                const result = await adminAccountsApi.syncFromCRS();
                setSyncResult(result);
                fetchAccounts();
                setTimeout(() => setSyncResult(null), 5000);
              } catch (error) {
                console.error('Failed to sync from CRS:', error);
              } finally {
                setSyncLoading(false);
              }
            }}
            isLoading={syncLoading}
          >
            <CloudCog className="w-4 h-4 mr-2" />
            {t('accounts.syncCRS')}
          </Button>
          <Button variant="secondary" onClick={() => setShowBatchImportModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            {t('accounts.batchImport')}
          </Button>
          <Button variant="secondary" onClick={() => setShowOAuthWizard(true)}>
            <KeyRound className="w-4 h-4 mr-2" />
            {t('accounts.addViaOAuth')}
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('accounts.addAccount')}
          </Button>
        </div>
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
              <option value="">{t('accounts.filter.allPlatforms')}</option>
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
              <option value="">{t('accounts.filter.allStatus')}</option>
              <option value="active">{t('accounts.status.active')}</option>
              <option value="disabled">{t('accounts.status.disabled')}</option>
              <option value="error">{t('accounts.status.error')}</option>
            </select>
            <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
              <Server className="w-4 h-4" />
              <span>{t('accounts.pagination.total', { total })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Operations Toolbar */}
      {selectedIds.size > 0 && (
        <Card className="mb-4">
          <CardContent className="p-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-[#00F0FF] font-medium">
                {t('accounts.batch.selected', { count: selectedIds.size })}
              </span>
              <div className="h-4 w-px bg-[#2A2A30]" />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBatchRefreshTier}
                isLoading={batchActionLoading}
              >
                <Star className="w-3.5 h-3.5 mr-1.5" />
                {t('accounts.batch.refreshTier')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowBulkUpdateModal(true)}
              >
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                {t('accounts.batch.bulkUpdate')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowBatchCredentialsModal(true)}
              >
                <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                {t('accounts.batch.updateCredentials')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                {t('accounts.batch.clearSelection')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accounts Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={accounts}
            loading={loading}
            emptyText={t('accounts.empty')}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#2A2A30]">
              <p className="text-sm text-gray-400">
                {t('accounts.pagination.showing', { start: (page - 1) * pageSize + 1, end: Math.min(page * pageSize, total), total })}
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
                  {t('accounts.pagination.page', { current: page, total: totalPages })}
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
                {testResult.success ? t('accounts.toast.testPassed') : t('accounts.toast.testFailed')}
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
                {refreshResult.success ? t('accounts.toast.refreshSuccessful') : t('accounts.toast.refreshFailed')}
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

      {/* CRS Sync Result Toast */}
      {syncResult && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg bg-emerald-500/20 border border-emerald-500/30">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-400">{t('accounts.toast.syncSuccess')}</p>
              <p className="text-xs text-gray-400">{syncResult.message} ({syncResult.synced_count} {t('accounts.toast.synced')})</p>
            </div>
            <button onClick={() => setSyncResult(null)} className="ml-2 text-gray-400 hover:text-white">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* OAuth Wizard Modal */}
      <OAuthWizardModal
        isOpen={showOAuthWizard}
        onClose={() => setShowOAuthWizard(false)}
        onSuccess={() => {
          setShowOAuthWizard(false);
          fetchAccounts();
        }}
      />

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title={t('accounts.modal.addAccount')}
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
        title={t('accounts.modal.editAccount')}
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
        title={t('accounts.modal.deleteAccount')}
      >
        {selectedAccount && (
          <div className="space-y-4">
            <p className="text-gray-400">
              {t('accounts.modal.deleteConfirmText')}{' '}
              <span className="text-white font-medium">{selectedAccount.name}</span>?
            </p>
            <p className="text-sm text-red-400">
              {t('accounts.modal.deleteWarning')}
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAccount(null);
                }}
              >
                {t('common:btn.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteAccount}
                isLoading={actionLoading}
              >
                {t('accounts.btn.deleteAccount')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Account Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setDetailAccount(null);
        }}
        title={detailAccount ? `${t('accounts.detail.title')} - ${detailAccount.name}` : t('accounts.detail.title')}
        size="lg"
      >
        {detailAccount && (
          <div className="space-y-6">
            {/* Account Info */}
            <div className="flex items-center gap-3">
              {getPlatformBadge(detailAccount.platform)}
              {getStatusBadge(detailAccount.status, t)}
              <span className="text-sm text-gray-400">#{detailAccount.id}</span>
            </div>

            {/* Today's Stats */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                {t('accounts.detail.todayStats')}
              </h3>
              {detailLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-[#0A0A0C] rounded-lg p-3 border border-[#2A2A30] animate-pulse">
                      <div className="h-4 bg-[#2A2A30] rounded w-16 mb-2" />
                      <div className="h-6 bg-[#2A2A30] rounded w-12" />
                    </div>
                  ))}
                </div>
              ) : todayStats ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#0A0A0C] rounded-lg p-3 border border-[#2A2A30]">
                    <p className="text-xs text-gray-500 mb-1">{t('accounts.detail.requests')}</p>
                    <p className="text-lg font-semibold text-white">{(todayStats.requests ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-[#0A0A0C] rounded-lg p-3 border border-[#2A2A30]">
                    <p className="text-xs text-gray-500 mb-1">{t('accounts.detail.tokens')}</p>
                    <p className="text-lg font-semibold text-white">{(todayStats.tokens ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-[#0A0A0C] rounded-lg p-3 border border-[#2A2A30]">
                    <p className="text-xs text-gray-500 mb-1">{t('accounts.detail.cost')}</p>
                    <p className="text-lg font-semibold text-[#00F0FF]">${(todayStats.cost ?? 0).toFixed(4)}</p>
                  </div>
                  <div className="bg-[#0A0A0C] rounded-lg p-3 border border-[#2A2A30]">
                    <p className="text-xs text-gray-500 mb-1">{t('accounts.detail.errors')}</p>
                    <p className={`text-lg font-semibold ${(todayStats.errors ?? 0) > 0 ? 'text-red-400' : 'text-white'}`}>{todayStats.errors ?? 0}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">{t('accounts.detail.noStats')}</p>
              )}
            </div>

            {/* Supported Models */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                {t('accounts.detail.models')}
              </h3>
              {detailLoading ? (
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-6 bg-[#2A2A30] rounded-full w-24 animate-pulse" />
                  ))}
                </div>
              ) : accountModels.length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {accountModels.map((model) => (
                    <Badge key={model} variant="info" size="sm">
                      {model}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">{t('accounts.detail.noModels')}</p>
              )}
            </div>

            {/* Temp Unschedulable Status */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t('accounts.detail.tempUnschedulable')}
              </h3>
              {detailLoading ? (
                <div className="h-6 bg-[#2A2A30] rounded w-48 animate-pulse" />
              ) : tempUnschedulable?.unschedulable_until ? (
                <div className="flex items-center gap-2">
                  <Badge variant="warning" size="sm">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {t('accounts.detail.unschedulableUntil', { time: formatDate(tempUnschedulable.unschedulable_until) })}
                  </Badge>
                </div>
              ) : (
                <Badge variant="success" size="sm">{t('accounts.detail.schedulable')}</Badge>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Batch Import Modal */}
      <Modal
        isOpen={showBatchImportModal}
        onClose={() => {
          setShowBatchImportModal(false);
          setBatchImportJson('');
        }}
        title={t('accounts.modal.batchImport')}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">{t('accounts.modal.batchImportDesc')}</p>
          <textarea
            value={batchImportJson}
            onChange={(e) => setBatchImportJson(e.target.value)}
            className="w-full h-64 bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-[#00F0FF] outline-none resize-none"
            placeholder={`[
  {
    "name": "Account 1",
    "platform": "claude",
    "type": "api_key",
    "credentials": { "api_key": "sk-..." },
    "concurrency": 5
  }
]`}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowBatchImportModal(false);
                setBatchImportJson('');
              }}
            >
              {t('common:btn.cancel')}
            </Button>
            <Button
              onClick={handleBatchImport}
              isLoading={batchActionLoading}
              disabled={!batchImportJson.trim()}
            >
              <Upload className="w-4 h-4 mr-2" />
              {t('accounts.btn.import')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Update Modal */}
      <Modal
        isOpen={showBulkUpdateModal}
        onClose={() => {
          setShowBulkUpdateModal(false);
          setBulkUpdateData({ status: '', concurrency: '', priority: '' });
        }}
        title={t('accounts.modal.bulkUpdate')}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            {t('accounts.modal.bulkUpdateDesc', { count: selectedIds.size })}
          </p>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('accounts.form.status')}</label>
            <select
              value={bulkUpdateData.status}
              onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, status: e.target.value })}
              className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="">{t('accounts.batch.noChange')}</option>
              <option value="active">{t('accounts.status.active')}</option>
              <option value="disabled">{t('accounts.status.disabled')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('accounts.form.concurrency')}</label>
            <Input
              type="number"
              min="1"
              placeholder={t('accounts.batch.noChange')}
              value={bulkUpdateData.concurrency}
              onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, concurrency: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('accounts.form.priority')}</label>
            <Input
              type="number"
              placeholder={t('accounts.batch.noChange')}
              value={bulkUpdateData.priority}
              onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, priority: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowBulkUpdateModal(false);
                setBulkUpdateData({ status: '', concurrency: '', priority: '' });
              }}
            >
              {t('common:btn.cancel')}
            </Button>
            <Button
              onClick={handleBulkUpdate}
              isLoading={batchActionLoading}
              disabled={!bulkUpdateData.status && !bulkUpdateData.concurrency && !bulkUpdateData.priority}
            >
              {t('accounts.btn.bulkUpdate')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Batch Update Credentials Modal */}
      <Modal
        isOpen={showBatchCredentialsModal}
        onClose={() => {
          setShowBatchCredentialsModal(false);
          setBatchCredentialsJson('{}');
        }}
        title={t('accounts.modal.batchCredentials')}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            {t('accounts.modal.batchCredentialsDesc', { count: selectedIds.size })}
          </p>
          <textarea
            value={batchCredentialsJson}
            onChange={(e) => setBatchCredentialsJson(e.target.value)}
            className="w-full h-40 bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-[#00F0FF] outline-none resize-none"
            placeholder='{"api_key": "sk-..."}'
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowBatchCredentialsModal(false);
                setBatchCredentialsJson('{}');
              }}
            >
              {t('common:btn.cancel')}
            </Button>
            <Button
              onClick={handleBatchUpdateCredentials}
              isLoading={batchActionLoading}
            >
              {t('accounts.btn.updateCredentials')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AccountsPage;
