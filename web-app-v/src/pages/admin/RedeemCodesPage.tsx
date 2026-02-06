import React, { useEffect, useState, useCallback } from 'react';
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

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'available':
      return <Badge variant="success">Available</Badge>;
    case 'used':
      return <Badge variant="info">Used</Badge>;
    case 'revoked':
    case 'expired':
      return <Badge variant="danger">Revoked</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};

const getTypeBadge = (type: string) => {
  switch (type.toLowerCase()) {
    case 'balance':
      return <Badge variant="primary">Balance</Badge>;
    case 'subscription':
      return <Badge variant="info">Subscription</Badge>;
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
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState<RedeemStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

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
      key: 'id',
      title: 'ID',
      render: (code: RedeemCode) => (
        <span className="text-sm text-gray-400">#{code.id}</span>
      ),
    },
    {
      key: 'code',
      title: 'Code',
      render: (code: RedeemCode) => (
        <div className="flex items-center gap-2">
          <code className="text-sm font-mono text-cyan-400 bg-[#0A0A0C] px-2 py-1 rounded">
            {code.code}
          </code>
          <button
            onClick={() => copyToClipboard(code.code)}
            className="p-1 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title="Copy code"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      render: (code: RedeemCode) => getTypeBadge(code.type),
    },
    {
      key: 'value',
      title: 'Value',
      render: (code: RedeemCode) => (
        <span className="text-sm text-white">
          {code.type === 'balance' ? `$${code.value.toFixed(2)}` : `${code.validity_days} days`}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (code: RedeemCode) => getStatusBadge(code.status),
    },
    {
      key: 'used',
      title: 'Used By',
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
      title: 'Created',
      render: (code: RedeemCode) => (
        <span className="text-sm text-gray-400">{formatDate(code.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (code: RedeemCode) => (
        <div className="flex items-center gap-2">
          {code.status === 'available' && (
            <button
              onClick={() => {
                setSelectedCode(code);
                setShowRevokeModal(true);
              }}
              className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-amber-400 transition-colors"
              title="Revoke Code"
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
            title="Delete Code"
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
          <h1 className="text-2xl font-bold text-white mb-1">Redeem Codes</h1>
          <p className="text-gray-400">Generate and manage redeem codes</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleViewStats}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Stats
          </Button>
          <Button variant="secondary" onClick={handleExportCodes}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowGenerateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Generate Codes
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
              <option value="">All Types</option>
              <option value="balance">Balance</option>
              <option value="subscription">Subscription</option>
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
              <option value="available">Available</option>
              <option value="used">Used</option>
              <option value="revoked">Revoked</option>
            </select>
            <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
              <Ticket className="w-4 h-4" />
              <span>{total} total codes</span>
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
            emptyText="No redeem codes found"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#2A2A30]">
              <p className="text-sm text-gray-400">
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, total)} of {total} codes
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

      {/* Generate Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => {
          setShowGenerateModal(false);
          resetGenerateForm();
        }}
        title="Generate Redeem Codes"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Type *</label>
            <select
              value={generateForm.type}
              onChange={(e) => setGenerateForm({ ...generateForm, type: e.target.value })}
              className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="balance">Balance</option>
              <option value="subscription">Subscription</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Count *</label>
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
                {generateForm.type === 'balance' ? 'Value (USD) *' : 'Validity Days *'}
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
              <label className="block text-sm text-gray-400 mb-1">Group *</label>
              <select
                value={generateForm.group_id || ''}
                onChange={(e) => setGenerateForm({ ...generateForm, group_id: e.target.value ? parseInt(e.target.value) : undefined })}
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
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowGenerateModal(false);
                resetGenerateForm();
              }}
            >
              Cancel
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
              Generate {generateForm.count} Codes
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
        title="Generated Codes"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              {generatedCodes.length} codes generated successfully
            </p>
            <Button variant="secondary" size="sm" onClick={copyAllCodes}>
              <Copy className="w-4 h-4 mr-2" />
              Copy All
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
              Done
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
        title="Revoke Code"
      >
        {selectedCode && (
          <div className="space-y-4">
            <p className="text-gray-400">
              Are you sure you want to revoke code{' '}
              <code className="text-cyan-400 bg-[#0A0A0C] px-2 py-1 rounded">
                {selectedCode.code}
              </code>
              ?
            </p>
            <p className="text-sm text-amber-400">
              This code will no longer be usable.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowRevokeModal(false);
                  setSelectedCode(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleRevokeCode}
                isLoading={actionLoading}
              >
                Revoke Code
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
        title="Delete Code"
      >
        {selectedCode && (
          <div className="space-y-4">
            <p className="text-gray-400">
              Are you sure you want to delete code{' '}
              <code className="text-cyan-400 bg-[#0A0A0C] px-2 py-1 rounded">
                {selectedCode.code}
              </code>
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
                  setSelectedCode(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteCode}
                isLoading={actionLoading}
              >
                Delete Code
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
        title="Redeem Code Statistics"
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
              <p className="text-xs text-gray-500 mb-1">Total Codes</p>
              <p className="text-xl font-bold text-white">{stats.total_codes}</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Available</p>
              <p className="text-xl font-bold text-emerald-400">{stats.available_codes}</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Used</p>
              <p className="text-xl font-bold text-cyan-400">{stats.used_codes}</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Revoked</p>
              <p className="text-xl font-bold text-red-400">{stats.revoked_codes}</p>
            </div>
            <div className="col-span-2 p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Total Value Redeemed</p>
              <p className="text-xl font-bold text-cyan-400">
                ${stats.total_value_redeemed?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Failed to load stats</p>
        )}
      </Modal>
    </div>
  );
};

export default RedeemCodesPage;
