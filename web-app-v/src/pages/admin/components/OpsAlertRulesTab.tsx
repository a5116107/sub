import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Edit,
  Trash2,
  VolumeX,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  adminOpsApi,
  type AlertRule,
  type CreateAlertRuleRequest,
  type CreateAlertSilenceRequest,
} from '../../../api/admin/ops';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  Table,
  Modal,
} from '../../../components/ui';

export const OpsAlertRulesTab: React.FC = () => {
  const { t } = useTranslation('admin');
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSilenceModal, setShowSilenceModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AlertRule | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateAlertRuleRequest>({
    name: '',
    description: '',
    type: 'error_rate',
    condition: 'gt',
    threshold: 0,
    severity: 'warning',
    enabled: true,
  });

  // Silence form
  const [silenceData, setSilenceData] = useState<CreateAlertSilenceRequest>({
    duration_minutes: 60,
    reason: '',
  });

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminOpsApi.getAlertRules();
      setRules(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch alert rules:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'error_rate',
      condition: 'gt',
      threshold: 0,
      severity: 'warning',
      enabled: true,
    });
  };

  const handleCreate = async () => {
    setActionLoading(true);
    try {
      await adminOpsApi.createAlertRule(formData);
      setShowCreateModal(false);
      resetForm();
      fetchRules();
    } catch (error) {
      console.error('Failed to create alert rule:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedRule) return;
    setActionLoading(true);
    try {
      await adminOpsApi.updateAlertRule(selectedRule.id, formData);
      setShowEditModal(false);
      setSelectedRule(null);
      resetForm();
      fetchRules();
    } catch (error) {
      console.error('Failed to update alert rule:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRule) return;
    setActionLoading(true);
    try {
      await adminOpsApi.deleteAlertRule(selectedRule.id);
      setShowDeleteModal(false);
      setSelectedRule(null);
      fetchRules();
    } catch (error) {
      console.error('Failed to delete alert rule:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleEnabled = async (rule: AlertRule) => {
    setActionLoading(true);
    try {
      await adminOpsApi.updateAlertRule(rule.id, { enabled: !rule.enabled });
      fetchRules();
    } catch (error) {
      console.error('Failed to toggle alert rule:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSilence = async () => {
    if (!selectedRule) return;
    setActionLoading(true);
    try {
      await adminOpsApi.createAlertSilence({
        ...silenceData,
        rule_id: selectedRule.id,
      });
      setShowSilenceModal(false);
      setSelectedRule(null);
      setSilenceData({ duration_minutes: 60, reason: '' });
    } catch (error) {
      console.error('Failed to create silence:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (rule: AlertRule) => {
    setSelectedRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description,
      type: rule.type,
      condition: rule.condition,
      threshold: rule.threshold,
      severity: rule.severity,
      enabled: rule.enabled,
    });
    setShowEditModal(true);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="danger">{t('ops.severity.critical')}</Badge>;
      case 'error':
        return <Badge variant="danger">{t('ops.severity.error')}</Badge>;
      case 'warning':
        return <Badge variant="warning">{t('ops.severity.warning')}</Badge>;
      case 'info':
        return <Badge variant="info">{t('ops.severity.info')}</Badge>;
      default:
        return <Badge variant="default">{severity}</Badge>;
    }
  };

  const columns = [
    {
      key: 'name',
      title: t('ops.alertRules.col.name'),
      render: (rule: AlertRule) => (
        <div>
          <p className="text-sm font-medium text-white">{rule.name}</p>
          {rule.description && (
            <p className="text-xs text-gray-500 truncate max-w-[200px]">{rule.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      title: t('ops.alertRules.col.type'),
      render: (rule: AlertRule) => (
        <span className="text-sm text-gray-300">{rule.type}</span>
      ),
    },
    {
      key: 'condition',
      title: t('ops.alertRules.col.condition'),
      render: (rule: AlertRule) => (
        <span className="text-sm text-cyan-400 font-mono">
          {rule.condition} {rule.threshold}
        </span>
      ),
    },
    {
      key: 'severity',
      title: t('ops.alertRules.col.severity'),
      render: (rule: AlertRule) => getSeverityBadge(rule.severity),
    },
    {
      key: 'enabled',
      title: t('ops.alertRules.col.enabled'),
      render: (rule: AlertRule) => (
        <button
          onClick={() => handleToggleEnabled(rule)}
          disabled={actionLoading}
          className="transition-colors"
        >
          {rule.enabled ? (
            <ToggleRight className="w-6 h-6 text-emerald-400" />
          ) : (
            <ToggleLeft className="w-6 h-6 text-gray-500" />
          )}
        </button>
      ),
    },
    {
      key: 'actions',
      title: t('ops.alertRules.col.actions'),
      render: (rule: AlertRule) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEditModal(rule)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title={t('ops.alertRules.action.edit')}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedRule(rule);
              setShowSilenceModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-amber-400 transition-colors"
            title={t('ops.alertRules.action.silence')}
          >
            <VolumeX className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedRule(rule);
              setShowDeleteModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-red-400 transition-colors"
            title={t('ops.alertRules.action.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const RuleForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">{t('ops.alertRules.form.name')}</label>
        <Input
          placeholder={t('ops.alertRules.form.namePlaceholder')}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">{t('ops.alertRules.form.description')}</label>
        <Input
          placeholder={t('ops.alertRules.form.descriptionPlaceholder')}
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('ops.alertRules.form.type')}</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
          >
            <option value="error_rate">Error Rate</option>
            <option value="latency">Latency</option>
            <option value="concurrency">Concurrency</option>
            <option value="availability">Availability</option>
            <option value="cost">Cost</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('ops.alertRules.form.condition')}</label>
          <select
            value={formData.condition}
            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
            className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
          >
            <option value="gt">&gt; (Greater than)</option>
            <option value="gte">&gt;= (Greater or equal)</option>
            <option value="lt">&lt; (Less than)</option>
            <option value="lte">&lt;= (Less or equal)</option>
            <option value="eq">= (Equal)</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('ops.alertRules.form.threshold')}</label>
          <Input
            type="number"
            step="0.01"
            value={formData.threshold}
            onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('ops.alertRules.form.severity')}</label>
          <select
            value={formData.severity}
            onChange={(e) => setFormData({ ...formData, severity: e.target.value as CreateAlertRuleRequest['severity'] })}
            className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
          >
            <option value="info">{t('ops.severity.info')}</option>
            <option value="warning">{t('ops.severity.warning')}</option>
            <option value="error">{t('ops.severity.error')}</option>
            <option value="critical">{t('ops.severity.critical')}</option>
          </select>
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
            setSelectedRule(null);
          }}
        >
          {t('common:btn.cancel')}
        </Button>
        <Button
          onClick={isEdit ? handleUpdate : handleCreate}
          isLoading={actionLoading}
          disabled={!formData.name}
        >
          {isEdit ? t('ops.alertRules.btn.update') : t('ops.alertRules.btn.create')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{t('ops.alertRules.description')}</p>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('ops.alertRules.addRule')}
        </Button>
      </div>

      {/* Rules Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={rules}
            loading={loading}
            emptyText={t('ops.alertRules.empty')}
          />
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title={t('ops.alertRules.modal.create')}
      >
        <RuleForm />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedRule(null);
          resetForm();
        }}
        title={t('ops.alertRules.modal.edit')}
      >
        <RuleForm isEdit />
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedRule(null);
        }}
        title={t('ops.alertRules.modal.delete')}
      >
        {selectedRule && (
          <div className="space-y-4">
            <p className="text-gray-400">
              {t('ops.alertRules.deleteConfirm')}{' '}
              <span className="text-white font-medium">{selectedRule.name}</span>?
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedRule(null);
                }}
              >
                {t('common:btn.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                isLoading={actionLoading}
              >
                {t('ops.alertRules.btn.delete')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Silence Modal */}
      <Modal
        isOpen={showSilenceModal}
        onClose={() => {
          setShowSilenceModal(false);
          setSelectedRule(null);
          setSilenceData({ duration_minutes: 60, reason: '' });
        }}
        title={t('ops.alertRules.modal.silence')}
      >
        {selectedRule && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              {t('ops.alertRules.silenceDesc')}{' '}
              <span className="text-white">{selectedRule.name}</span>
            </p>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('ops.alertRules.form.duration')}</label>
              <select
                value={silenceData.duration_minutes}
                onChange={(e) => setSilenceData({ ...silenceData, duration_minutes: parseInt(e.target.value) })}
                className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
              >
                <option value={15}>15 {t('ops.alertRules.minutes')}</option>
                <option value={30}>30 {t('ops.alertRules.minutes')}</option>
                <option value={60}>1 {t('ops.alertRules.hour')}</option>
                <option value={120}>2 {t('ops.alertRules.hours')}</option>
                <option value={240}>4 {t('ops.alertRules.hours')}</option>
                <option value={480}>8 {t('ops.alertRules.hours')}</option>
                <option value={1440}>24 {t('ops.alertRules.hours')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('ops.alertRules.form.reason')}</label>
              <Input
                placeholder={t('ops.alertRules.form.reasonPlaceholder')}
                value={silenceData.reason || ''}
                onChange={(e) => setSilenceData({ ...silenceData, reason: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowSilenceModal(false);
                  setSelectedRule(null);
                  setSilenceData({ duration_minutes: 60, reason: '' });
                }}
              >
                {t('common:btn.cancel')}
              </Button>
              <Button
                onClick={handleCreateSilence}
                isLoading={actionLoading}
              >
                {t('ops.alertRules.btn.silence')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OpsAlertRulesTab;
