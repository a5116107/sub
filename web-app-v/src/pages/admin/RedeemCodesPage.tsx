import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Ticket,
  Plus,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Copy,
  XCircle,
  BarChart3,
  Clock,
} from 'lucide-react';
import { adminRedeemApi, type RedeemCodeQueryParams, type GenerateRedeemCodesRequest } from '../../api/admin/redeem';
import { adminGroupsApi } from '../../api/admin/groups';
import type { RedeemCode, Group } from '../../types';
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
    case 'available':
      return <Badge variant="success">{t('redeemCodes.status.available')}</Badge>;
    case 'used':
      return <Badge variant="info">{t('redeemCodes.status.used')}</Badge>;
    case 'revoked':
    case 'expired':
      return <Badge variant="danger">{t('redeemCodes.status.revoked')}</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};

const getTypeBadge = (type: string, t: (key: string) => string) => {
  switch (type.toLowerCase()) {
    case 'balance':
      return <Badge variant="primary">{t('redeemCodes.type.balance')}</Badge>;
    case 'subscription':
      return <Badge variant="info">{t('redeemCodes.type.subscription')}</Badge>;
    default:
      return <Badge variant="default">{type}</Badge>;
  }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

interface RedeemStats {
  total_codes: number;
  used_codes: number;
  available_codes: number;
  revoked_codes: number;
  total_value_redeemed: number;
}

export const RedeemCodesPage: React.FC = () => {
  const { t } = useTranslation('admin');
  const [loading, setLoading] = useState(true);
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [groups, setGroups] = useState<Group[]>([]);

  // Modal states
  const [selectedCode, setSelectedCode] = useState<RedeemCode | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showGeneratedModal, setShowGeneratedModal] = useState(false);
  const [showExpireModal, setShowExpireModal] = useState(false);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState<RedeemStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false);

  // Form state for generate
  const [generateForm, setGenerateForm] = useState<GenerateRedeemCodesRequest>({
    count: 10,
    type: 'balance',
    value: 10,
    group_id: undefined,
    validity_days: 30,
  });

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const params: RedeemCodeQueryParams = {
        page,
        page_size: pageSize,
      };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;

      const response = await adminRedeemApi.getCodes(params);
      setCodes(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch redeem codes:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, typeFilter]);

  const fetchGroups = useCallback(async () => {
    try {
      const response = await adminGroupsApi.getGroups({ page_size: 100 });
      setGroups(response.items);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  }, []);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleGenerateCodes = async () => {
    if (generateForm.count <= 0 || generateForm.value <= 0) return;

    setActionLoading(true);
    try {
      const result = await adminRedeemApi.generateCodes(generateForm);
      setGeneratedCodes(result.codes);
      setShowGenerateModal(false);
      setShowGeneratedModal(true);
      resetGenerateForm();
      fetchCodes();
    } catch (error) {
      console.error('Failed to generate codes:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeCode = async () => {
    if (!selectedCode) return;

    setActionLoading(true);
    try {
      await adminRedeemApi.revokeCode(selectedCode.id);
      setShowRevokeModal(false);
      setSelectedCode(null);
      fetchCodes();
    } catch (error) {
      console.error('Failed to revoke code:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCode = async () => {
    if (!selectedCode) return;

    setActionLoading(true);
    try {
      await adminRedeemApi.deleteCode(selectedCode.id);
      setShowDeleteModal(false);
      setSelectedCode(null);
      fetchCodes();
    } catch (error) {
      console.error('Failed to delete code:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCodes = async () => {
    try {
      const params: { status?: string; type?: string } = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;

      const csvData = await adminRedeemApi.exportCodes(params);
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `redeem-codes-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export codes:', error);
    }
  };

  const handleViewStats = async () => {
    setShowStatsModal(true);
    setStatsLoading(true);
    try {
      const statsData = await adminRedeemApi.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleExpireCode = async () => {
    if (!selectedCode) return;
    setActionLoading(true);
    try {
      await adminRedeemApi.expireCode(selectedCode.id);
      setShowExpireModal(false);
      setSelectedCode(null);
      fetchCodes();
    } catch (error) {
      console.error('Failed to expire code:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setBatchDeleteLoading(true);
    try {
      await adminRedeemApi.batchDelete(selectedIds);
      setSelectedIds([]);
      setShowBatchDeleteModal(false);
      fetchCodes();
    } catch (error) {
      console.error('Failed to batch delete codes:', error);
    } finally {
      setBatchDeleteLoading(false);
    }
  };

  const toggleSelectCode = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyAllCodes = () => {
    navigator.clipboard.writeText(generatedCodes.join('\n'));
  };

  const resetGenerateForm = () => {
    setGenerateForm({
      count: 10,
      type: 'balance',
      value: 10,
      group_id: undefined,
      validity_days: 30,
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  const columns = [
    {
      key: 'select',
      title: '',
      render: (code: RedeemCode) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(code.id)}
          onChange={() => toggleSelectCode(code.id)}
          className="rounded border-[#2A2A30] bg-[#0A0A0C] text-cyan-500 focus:ring-cyan-500"
        />
      ),
    },
    {
      key: 'id',
      title: t('redeemCodes.col.id'),
      render: (code: RedeemCode) => (
        <span className="text-sm text-gray-400">#{code.id}</span>
      ),
    },
    {
      key: 'code',
      title: t('redeemCodes.col.code'),
      render: (code: RedeemCode) => (
        <div className="flex items-center gap-2">
          <code className="text-sm font-mono text-cyan-400 bg-[#0A0A0C] px-2 py-1 rounded">
            {code.code}
          </code>
          <button
            onClick={() => copyToClipboard(code.code)}
            className="p-1 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title={t('common:btn.copy')}
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
      ),
    },
    {
      key: 'type',
      title: t('redeemCodes.col.type'),
      render: (code: RedeemCode) => getTypeBadge(code.type, t),
    },
    {
      key: 'value',
      title: t('redeemCodes.col.value'),
      render: (code: RedeemCode) => (
        <span className="text-sm text-white">
          {code.type === 'balance' ? `$${code.value.toFixed(2)}` : `${code.validity_days} days`}
        </span>
      ),
    },
    {
      key: 'status',
      title: t('redeemCodes.col.status'),
      render: (code: RedeemCode) => getStatusBadge(code.status, t),
    },
    {
      key: 'used',
      title: t('redeemCodes.col.usedBy'),
      render: (code: RedeemCode) => (
        <div className="text-sm">
          {code.used_by ? (
            <>
              <p className="text-gray-400">User #{code.used_by}</p>
              {code.used_at && (
                <p className="text-xs text-gray-500">{formatDate(code.used_at)}</p>
              )}
            </>
          ) : (
            <span className="text-gray-500">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'created',
      title: t('redeemCodes.col.created'),
      render: (code: RedeemCode) => (
        <span className="text-sm text-gray-400">{formatDate(code.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      title: t('redeemCodes.col.actions'),
      render: (code: RedeemCode) => (
        <div className="flex items-center gap-2">
          {code.status === 'available' && (
            <button
              onClick={() => {
                setSelectedCode(code);
                setShowExpireModal(true);
              }}
              className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-orange-400 transition-colors"
              title={t('redeemCodes.expireTitle')}
            >
              <Clock className="w-4 h-4" />
            </button>
          )}
          {code.status === 'available' && (
            <button
              onClick={() => {
                setSelectedCode(code);
                setShowRevokeModal(true);
              }}
              className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-amber-400 transition-colors"
              title={t('redeemCodes.revokeTitle')}
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => {
              setSelectedCode(code);
              setShowDeleteModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-red-400 transition-colors"
            title={t('redeemCodes.deleteTitle')}
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
          <h1 className="text-2xl font-bold text-white mb-1">{t('redeemCodes.title')}</h1>
          <p className="text-gray-400">{t('redeemCodes.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {selectedIds.length > 0 && (
            <Button variant="danger" onClick={() => setShowBatchDeleteModal(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t('redeemCodes.deleteSelected', { count: selectedIds.length })}
            </Button>
          )}
          <Button variant="secondary" onClick={handleViewStats}>
            <BarChart3 className="w-4 h-4 mr-2" />
            {t('redeemCodes.stats')}
          </Button>
          <Button variant="secondary" onClick={handleExportCodes}>
            <Download className="w-4 h-4 mr-2" />
            {t('redeemCodes.export')}
          </Button>
          <Button onClick={() => setShowGenerateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('redeemCodes.generate')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="">{t('redeemCodes.filter.allTypes')}</option>
              <option value="balance">{t('redeemCodes.filter.balance')}</option>
              <option value="subscription">{t('redeemCodes.filter.subscription')}</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="">{t('redeemCodes.filter.allStatus')}</option>
              <option value="available">{t('redeemCodes.filter.available')}</option>
              <option value="used">{t('redeemCodes.filter.used')}</option>
              <option value="revoked">{t('redeemCodes.filter.revoked')}</option>
            </select>
            <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
              <Ticket className="w-4 h-4" />
              <span>{t('redeemCodes.total', { count: total })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Codes Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={codes}
            loading={loading}
            emptyText={t('redeemCodes.empty')}
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

      {/* Generate Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => {
          setShowGenerateModal(false);
          resetGenerateForm();
        }}
        title={t('redeemCodes.generateTitle')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('redeemCodes.form.type')} *</label>
            <select
              value={generateForm.type}
              onChange={(e) => setGenerateForm({ ...generateForm, type: e.target.value })}
              className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="balance">{t('redeemCodes.filter.balance')}</option>
              <option value="subscription">{t('redeemCodes.filter.subscription')}</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('redeemCodes.form.count')} *</label>
              <Input
                type="number"
                min="1"
                max="1000"
                placeholder="10"
                value={generateForm.count}
                onChange={(e) => setGenerateForm({ ...generateForm, count: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {generateForm.type === 'balance' ? t('redeemCodes.form.valueUsd') + ' *' : t('redeemCodes.form.validityDays') + ' *'}
              </label>
              <Input
                type="number"
                min="1"
                placeholder={generateForm.type === 'balance' ? '10' : '30'}
                value={generateForm.type === 'balance' ? generateForm.value : generateForm.validity_days}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  if (generateForm.type === 'balance') {
                    setGenerateForm({ ...generateForm, value: val });
                  } else {
                    setGenerateForm({ ...generateForm, validity_days: val });
                  }
                }}
              />
            </div>
          </div>
          {generateForm.type === 'subscription' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('redeemCodes.form.group')} *</label>
              <select
                value={generateForm.group_id || ''}
                onChange={(e) => setGenerateForm({ ...generateForm, group_id: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
              >
                <option value="">{t('redeemCodes.form.selectGroup')}</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.platform})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowGenerateModal(false);
                resetGenerateForm();
              }}
            >
              {t('common:btn.cancel')}
            </Button>
            <Button
              onClick={handleGenerateCodes}
              isLoading={actionLoading}
              disabled={
                generateForm.count <= 0 ||
                (generateForm.type === 'balance' && generateForm.value <= 0) ||
                (generateForm.type === 'subscription' && (!generateForm.group_id || !generateForm.validity_days))
              }
            >
              {t('redeemCodes.generateCount', { count: generateForm.count })}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Generated Codes Modal */}
      <Modal
        isOpen={showGeneratedModal}
        onClose={() => {
          setShowGeneratedModal(false);
          setGeneratedCodes([]);
        }}
        title={t('redeemCodes.generatedTitle')}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              {t('redeemCodes.generatedSuccess', { count: generatedCodes.length })}
            </p>
            <Button variant="secondary" size="sm" onClick={copyAllCodes}>
              <Copy className="w-4 h-4 mr-2" />
              {t('redeemCodes.copyAll')}
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto bg-[#0A0A0C] rounded-lg p-4">
            <div className="space-y-2">
              {generatedCodes.map((code, index) => (
                <div key={index} className="flex items-center justify-between">
                  <code className="text-sm font-mono text-cyan-400">{code}</code>
                  <button
                    onClick={() => copyToClipboard(code)}
                    className="p-1 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowGeneratedModal(false);
                setGeneratedCodes([]);
              }}
            >
              {t('common:btn.done')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revoke Modal */}
      <Modal
        isOpen={showRevokeModal}
        onClose={() => {
          setShowRevokeModal(false);
          setSelectedCode(null);
        }}
        title={t('redeemCodes.revokeTitle')}
      >
        {selectedCode && (
          <div className="space-y-4">
            <p className="text-gray-400">
              {t('redeemCodes.revokeConfirm', { code: selectedCode.code })}
            </p>
            <p className="text-sm text-amber-400">
              {t('redeemCodes.revokeWarning')}
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowRevokeModal(false);
                  setSelectedCode(null);
                }}
              >
                {t('common:btn.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleRevokeCode}
                isLoading={actionLoading}
              >
                {t('redeemCodes.revokeCode')}
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
          setSelectedCode(null);
        }}
        title={t('redeemCodes.deleteTitle')}
      >
        {selectedCode && (
          <div className="space-y-4">
            <p className="text-gray-400">
              {t('redeemCodes.deleteConfirm', { code: selectedCode.code })}
            </p>
            <p className="text-sm text-red-400">
              {t('redeemCodes.deleteWarning')}
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedCode(null);
                }}
              >
                {t('common:btn.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteCode}
                isLoading={actionLoading}
              >
                {t('redeemCodes.deleteCode')}
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
        title={t('redeemCodes.statsTitle')}
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
              <p className="text-xs text-gray-500 mb-1">{t('redeemCodes.stat.total')}</p>
              <p className="text-xl font-bold text-white">{stats.total_codes}</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">{t('redeemCodes.stat.available')}</p>
              <p className="text-xl font-bold text-emerald-400">{stats.available_codes}</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">{t('redeemCodes.stat.used')}</p>
              <p className="text-xl font-bold text-cyan-400">{stats.used_codes}</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">{t('redeemCodes.stat.revoked')}</p>
              <p className="text-xl font-bold text-red-400">{stats.revoked_codes}</p>
            </div>
            <div className="col-span-2 p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">{t('redeemCodes.stat.totalValue')}</p>
              <p className="text-xl font-bold text-cyan-400">
                ${stats.total_value_redeemed?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Failed to load stats</p>
        )}
      </Modal>

      {/* Expire Modal */}
      <Modal
        isOpen={showExpireModal}
        onClose={() => {
          setShowExpireModal(false);
          setSelectedCode(null);
        }}
        title={t('redeemCodes.expireTitle')}
      >
        {selectedCode && (
          <div className="space-y-4">
            <p className="text-gray-400">
              {t('redeemCodes.expireConfirm', { code: selectedCode.code })}
            </p>
            <p className="text-sm text-amber-400">
              {t('redeemCodes.expireWarning')}
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowExpireModal(false);
                  setSelectedCode(null);
                }}
              >
                {t('common:btn.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleExpireCode}
                isLoading={actionLoading}
              >
                {t('redeemCodes.expireCode')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Batch Delete Modal */}
      <Modal
        isOpen={showBatchDeleteModal}
        onClose={() => setShowBatchDeleteModal(false)}
        title={t('redeemCodes.batchDeleteTitle')}
      >
        <div className="space-y-4">
          <p className="text-gray-400">
            {t('redeemCodes.batchDeleteConfirm', { count: selectedIds.length })}
          </p>
          <p className="text-sm text-red-400">
            {t('redeemCodes.deleteWarning')}
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowBatchDeleteModal(false)}>
              {t('common:btn.cancel')}
            </Button>
            <Button variant="danger" onClick={handleBatchDelete} isLoading={batchDeleteLoading}>
              {t('redeemCodes.deleteSelected', { count: selectedIds.length })}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RedeemCodesPage;
