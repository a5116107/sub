import React, { useEffect, useState, useCallback } from 'react';
import {
  Tag,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Users,
} from 'lucide-react';
import { adminPromoApi, type PromoCodeQueryParams } from '../../api/admin/promo';
import type { PromoCode } from '../../types';
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
    case 'expired':
      return <Badge variant="info">Expired</Badge>;
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

interface PromoStats {
  total_codes: number;
  active_codes: number;
  expired_codes: number;
  total_uses: number;
  total_bonus_given: number;
}

interface PromoUsage {
  id: number;
  user_id: number;
  user_email: string;
  used_at: string;
}

export const PromoCodesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modal states
  const [selectedCode, setSelectedCode] = useState<PromoCode | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState<PromoStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [usages, setUsages] = useState<PromoUsage[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<PromoCode>>({
    code: '',
    bonus_amount: 10,
    max_uses: 100,
    status: 'active',
    expires_at: '',
    notes: '',
  });

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const params: PromoCodeQueryParams = {
        page,
        page_size: pageSize,
      };
      if (statusFilter) params.status = statusFilter;

      const response = await adminPromoApi.getCodes(params);
      setCodes(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch promo codes:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const handleCreateCode = async () => {
    if (!formData.code || !formData.bonus_amount) return;

    setActionLoading(true);
    try {
      await adminPromoApi.createCode({
        ...formData,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : undefined,
      });
      setShowCreateModal(false);
      resetForm();
      fetchCodes();
    } catch (error) {
      console.error('Failed to create promo code:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCode = async () => {
    if (!selectedCode) return;

    setActionLoading(true);
    try {
      await adminPromoApi.updateCode(selectedCode.id, {
        ...formData,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : undefined,
      });
      setShowEditModal(false);
      setSelectedCode(null);
      resetForm();
      fetchCodes();
    } catch (error) {
      console.error('Failed to update promo code:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCode = async () => {
    if (!selectedCode) return;

    setActionLoading(true);
    try {
      await adminPromoApi.deleteCode(selectedCode.id);
      setShowDeleteModal(false);
      setSelectedCode(null);
      fetchCodes();
    } catch (error) {
      console.error('Failed to delete promo code:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewStats = async () => {
    setShowStatsModal(true);
    setStatsLoading(true);
    try {
      const statsData = await adminPromoApi.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleViewUsage = async (code: PromoCode) => {
    setSelectedCode(code);
    setShowUsageModal(true);
    setUsageLoading(true);
    try {
      const response = await adminPromoApi.getUsage(code.id, { page_size: 50 });
      setUsages(response.items);
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    } finally {
      setUsageLoading(false);
    }
  };

  const openEditModal = (code: PromoCode) => {
    setSelectedCode(code);
    setFormData({
      code: code.code,
      bonus_amount: code.bonus_amount,
      max_uses: code.max_uses,
      status: code.status,
      expires_at: code.expires_at ? code.expires_at.split('T')[0] : '',
      notes: code.notes,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      bonus_amount: 10,
      max_uses: 100,
      status: 'active',
      expires_at: '',
      notes: '',
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  const columns = [
    {
      key: 'id',
      title: 'ID',
      render: (code: PromoCode) => (
        <span className="text-sm text-gray-400">#{code.id}</span>
      ),
    },
    {
      key: 'code',
      title: 'Code',
      render: (code: PromoCode) => (
        <code className="text-sm font-mono text-cyan-400 bg-[#0A0A0C] px-2 py-1 rounded">
          {code.code}
        </code>
      ),
    },
    {
      key: 'bonus',
      title: 'Bonus',
      render: (code: PromoCode) => (
        <span className="text-sm text-emerald-400 font-medium">
          ${code.bonus_amount.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'usage',
      title: 'Usage',
      render: (code: PromoCode) => (
        <div className="text-sm">
          <span className="text-white">{code.used_count}</span>
          <span className="text-gray-500"> / {code.max_uses}</span>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (code: PromoCode) => getStatusBadge(code.status),
    },
    {
      key: 'expires',
      title: 'Expires',
      render: (code: PromoCode) => (
        <span className="text-sm text-gray-400">
          {code.expires_at ? formatDate(code.expires_at) : 'Never'}
        </span>
      ),
    },
    {
      key: 'created',
      title: 'Created',
      render: (code: PromoCode) => (
        <span className="text-sm text-gray-400">{formatDate(code.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (code: PromoCode) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewUsage(code)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-cyan-400 transition-colors"
            title="View Usage"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEditModal(code)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title="Edit Code"
          >
            <Edit className="w-4 h-4" />
          </button>
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

  const PromoForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Code *</label>
        <Input
          placeholder="PROMO2024"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          disabled={isEdit}
        />
        {isEdit && (
          <p className="text-xs text-gray-500 mt-1">Code cannot be changed after creation</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Bonus Amount (USD) *</label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="10.00"
            value={formData.bonus_amount}
            onChange={(e) => setFormData({ ...formData, bonus_amount: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Max Uses *</label>
          <Input
            type="number"
            min="1"
            placeholder="100"
            value={formData.max_uses}
            onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
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
          <label className="block text-sm text-gray-400 mb-1">Expires At</label>
          <Input
            type="date"
            value={formData.expires_at}
            onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Notes</label>
        <Input
          placeholder="Internal notes about this promo code"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button
          variant="secondary"
          onClick={() => {
            isEdit ? setShowEditModal(false) : setShowCreateModal(false);
            resetForm();
            setSelectedCode(null);
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={isEdit ? handleUpdateCode : handleCreateCode}
          isLoading={actionLoading}
          disabled={!formData.code || !formData.bonus_amount || !formData.max_uses}
        >
          {isEdit ? 'Update Code' : 'Create Code'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Promo Codes</h1>
          <p className="text-gray-400">Create and manage promotional codes</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleViewStats}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Stats
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Code
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
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
              <option value="expired">Expired</option>
            </select>
            <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
              <Tag className="w-4 h-4" />
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
            emptyText="No promo codes found"
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

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create Promo Code"
      >
        <PromoForm />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedCode(null);
          resetForm();
        }}
        title="Edit Promo Code"
      >
        <PromoForm isEdit />
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedCode(null);
        }}
        title="Delete Promo Code"
      >
        {selectedCode && (
          <div className="space-y-4">
            <p className="text-gray-400">
              Are you sure you want to delete promo code{' '}
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

      {/* Usage Modal */}
      <Modal
        isOpen={showUsageModal}
        onClose={() => {
          setShowUsageModal(false);
          setSelectedCode(null);
          setUsages([]);
        }}
        title={`Usage: ${selectedCode?.code || ''}`}
      >
        {usageLoading ? (
          <div className="space-y-4">
            <Skeleton height={40} />
            <Skeleton height={40} />
            <Skeleton height={40} />
          </div>
        ) : usages.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-[#121215]">
                <tr className="border-b border-[#2A2A30]">
                  <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">User</th>
                  <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Used At</th>
                </tr>
              </thead>
              <tbody>
                {usages.map((usage) => (
                  <tr key={usage.id} className="border-b border-[#2A2A30]/50">
                    <td className="py-2 px-3">
                      <p className="text-sm text-white">{usage.user_email}</p>
                      <p className="text-xs text-gray-500">ID: {usage.user_id}</p>
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-400">
                      {formatDate(usage.used_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No usage records found</p>
        )}
      </Modal>

      {/* Stats Modal */}
      <Modal
        isOpen={showStatsModal}
        onClose={() => {
          setShowStatsModal(false);
          setStats(null);
        }}
        title="Promo Code Statistics"
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
              <p className="text-xs text-gray-500 mb-1">Active</p>
              <p className="text-xl font-bold text-emerald-400">{stats.active_codes}</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Expired</p>
              <p className="text-xl font-bold text-gray-400">{stats.expired_codes}</p>
            </div>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Total Uses</p>
              <p className="text-xl font-bold text-cyan-400">{stats.total_uses}</p>
            </div>
            <div className="col-span-2 p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Total Bonus Given</p>
              <p className="text-xl font-bold text-emerald-400">
                ${stats.total_bonus_given?.toFixed(2) || '0.00'}
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

export default PromoCodesPage;
