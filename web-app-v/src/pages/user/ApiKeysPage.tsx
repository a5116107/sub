import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Key, Plus, Copy, Trash2, Eye, EyeOff, Settings2 } from 'lucide-react';
import { keysApi } from '../../api/keys';
import { api } from '../../api/client';
import type { APIKey, CreateAPIKeyRequest, UpdateAPIKeyRequest } from '../../types';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Modal,
  Input,
  Table,
} from '../../components/ui';

interface AvailableGroup {
  id: number;
  name: string;
  description: string;
  platform: string;
}

export const ApiKeysPage: React.FC = () => {
  const { t } = useTranslation(['keys', 'common']);
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<APIKey | null>(null);
  const [newKeyData, setNewKeyData] = useState<Partial<CreateAPIKeyRequest>>({
    name: '',
    allow_balance: true,
    allow_subscription: true,
    subscription_strict: false,
  });
  const [editKeyData, setEditKeyData] = useState<Partial<UpdateAPIKeyRequest & { id: number }>>({});
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<Record<number, boolean>>({});
  const [availableGroups, setAvailableGroups] = useState<AvailableGroup[]>([]);
  const [ipWhitelistText, setIpWhitelistText] = useState('');
  const [ipBlacklistText, setIpBlacklistText] = useState('');
  const [editIpWhitelistText, setEditIpWhitelistText] = useState('');
  const [editIpBlacklistText, setEditIpBlacklistText] = useState('');

  const fetchKeys = async () => {
    try {
      const response = await keysApi.getKeys();
      setKeys(response.items || []);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const groups = await api.get<AvailableGroup[]>('/groups/available');
      setAvailableGroups(Array.isArray(groups) ? groups : []);
    } catch {
      // Groups endpoint may not be available, silently fail
      setAvailableGroups([]);
    }
  };

  useEffect(() => {
    fetchKeys();
    fetchGroups();
  }, []);

  const handleCreate = async () => {
    try {
      const data: CreateAPIKeyRequest = {
        name: newKeyData.name || '',
        group_id: newKeyData.group_id || undefined,
        ip_whitelist: ipWhitelistText ? ipWhitelistText.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        ip_blacklist: ipBlacklistText ? ipBlacklistText.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        expires_at: newKeyData.expires_at || undefined,
        quota_limit_usd: newKeyData.quota_limit_usd || undefined,
        allow_balance: newKeyData.allow_balance,
        allow_subscription: newKeyData.allow_subscription,
        subscription_strict: newKeyData.subscription_strict,
      };
      const response = await keysApi.createKey(data);
      setNewlyCreatedKey(response.full_key);
      setKeys([...keys, response]);
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const handleUpdate = async () => {
    if (!editKeyData.id) return;
    try {
      const data: UpdateAPIKeyRequest = {
        name: editKeyData.name,
        status: editKeyData.status,
        ip_whitelist: editIpWhitelistText ? editIpWhitelistText.split(',').map(s => s.trim()).filter(Boolean) : [],
        ip_blacklist: editIpBlacklistText ? editIpBlacklistText.split(',').map(s => s.trim()).filter(Boolean) : [],
        expires_at: editKeyData.expires_at || undefined,
        quota_limit_usd: editKeyData.quota_limit_usd,
        allow_balance: editKeyData.allow_balance,
        allow_subscription: editKeyData.allow_subscription,
        subscription_strict: editKeyData.subscription_strict,
      };
      const updated = await keysApi.updateKey(editKeyData.id, data);
      setKeys(keys.map(k => k.id === editKeyData.id ? updated : k));
      setIsEditModalOpen(false);
      setEditKeyData({});
    } catch (error) {
      console.error('Failed to update API key:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedKey) return;
    try {
      await keysApi.deleteKey(selectedKey.id);
      setKeys(keys.filter((k) => k.id !== selectedKey.id));
      setIsDeleteModalOpen(false);
      setSelectedKey(null);
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const openEditModal = (key: APIKey) => {
    setEditKeyData({
      id: key.id,
      name: key.name,
      status: key.status,
      expires_at: key.expires_at || '',
      quota_limit_usd: key.quota_limit_usd,
      allow_balance: key.allow_balance,
      allow_subscription: key.allow_subscription,
      subscription_strict: key.subscription_strict,
    });
    setEditIpWhitelistText(key.ip_whitelist?.join(', ') || '');
    setEditIpBlacklistText(key.ip_blacklist?.join(', ') || '');
    setIsEditModalOpen(true);
  };

  const resetCreateForm = () => {
    setNewKeyData({ name: '', allow_balance: true, allow_subscription: true, subscription_strict: false });
    setIpWhitelistText('');
    setIpBlacklistText('');
    setNewlyCreatedKey(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleShowKey = (id: number) => {
    setShowKey((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const columns = [
    {
      key: 'name',
      title: t('keys:col.name'),
      render: (key: APIKey) => (
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-[var(--text-primary)] font-medium">{key.name}</span>
        </div>
      ),
    },
    {
      key: 'key',
      title: t('keys:col.apiKey'),
      render: (key: APIKey) => (
        <div className="flex items-center gap-2">
          <code className="text-sm text-[var(--text-secondary)] font-mono">
            {showKey[key.id] ? key.key : `${key.key.slice(0, 8)}...${key.key.slice(-4)}`}
          </code>
          <button
            onClick={() => toggleShowKey(key.id)}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            {showKey[key.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
        </div>
      ),
    },
    {
      key: 'status',
      title: t('keys:col.status'),
      render: (key: APIKey) => (
        <Badge variant={key.status === 'active' ? 'success' : 'danger'}>
          {key.status}
        </Badge>
      ),
    },
    {
      key: 'usage',
      title: t('keys:col.usage'),
      render: (key: APIKey) => {
        const hasLimit = key.quota_limit_usd != null && key.quota_limit_usd > 0;
        const percentage = hasLimit ? Math.min((key.quota_used_usd / key.quota_limit_usd!) * 100, 100) : 0;
        const barColor = percentage >= 95 ? '#EF4444' : percentage >= 80 ? '#F59E0B' : '#00F0FF';

        return (
          <div className="min-w-[120px]">
            <div className="text-sm text-[var(--text-secondary)]">
              {hasLimit ? (
                <span>
                  ${key.quota_used_usd.toFixed(2)} / ${key.quota_limit_usd!.toFixed(2)}
                </span>
              ) : (
                <span>${key.quota_used_usd.toFixed(2)}</span>
              )}
            </div>
            {hasLimit && (
              <div className="mt-1 h-1.5 bg-[var(--border-color-subtle)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'created_at',
      title: t('keys:col.created'),
      render: (key: APIKey) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {new Date(key.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '',
      align: 'right' as const,
      render: (key: APIKey) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => copyToClipboard(key.key)}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)] rounded-lg transition-colors"
            title={t('common:btn.copy')}
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEditModal(key)}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-soft)] rounded-lg transition-colors"
            title={t('keys:edit.title')}
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedKey(key);
              setIsDeleteModalOpen(true);
            }}
            className="p-2 text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--accent-soft)] rounded-lg transition-colors"
            title={t('common:btn.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const ToggleSwitch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-color)]'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">{t('keys:title')}</h1>
          <p className="text-[var(--text-secondary)]">{t('keys:subtitle')}</p>
        </div>
        <Button
          variant="primary"
          glow
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          {t('keys:createKey')}
        </Button>
      </div>

      {/* Keys Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={keys}
            loading={loading}
            emptyText={t('keys:emptyText')}
          />
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetCreateForm();
        }}
        title={newlyCreatedKey ? t('keys:create.created') : t('keys:create.title')}
        size="lg"
        footer={
          newlyCreatedKey ? (
            <Button
              variant="primary"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetCreateForm();
              }}
            >
              {t('common:btn.done')}
            </Button>
          ) : (
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetCreateForm();
                }}
              >
                {t('common:btn.cancel')}
              </Button>
              <Button variant="primary" onClick={handleCreate} disabled={!newKeyData.name}>
                {t('common:btn.create')}
              </Button>
            </div>
          )
        }
      >
        {newlyCreatedKey ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm text-emerald-400 mb-2">
                {t('keys:create.copyWarning')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-sm font-mono text-[var(--text-primary)] break-all">
                {newlyCreatedKey}
              </code>
              <Button
                variant="secondary"
                onClick={() => copyToClipboard(newlyCreatedKey)}
                leftIcon={<Copy className="w-4 h-4" />}
              >
                {t('common:btn.copy')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{t('keys:create.basicInfo')}</p>
              <Input
                label={t('keys:create.name')}
                value={newKeyData.name}
                onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
                placeholder={t('keys:create.namePlaceholder')}
                required
              />
            </div>

            {/* Access Control */}
            <div className="border-t border-[var(--border-color)] pt-4">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{t('keys:create.accessControl')}</p>
              <div className="space-y-4">
                {availableGroups.length > 0 && (
                  <div>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('keys:create.group')}</label>
                    <select
                      value={newKeyData.group_id || ''}
                      onChange={(e) => setNewKeyData({ ...newKeyData, group_id: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:border-[var(--focus-ring)] focus:outline-none"
                    >
                      <option value="">{t('keys:create.noGroup')}</option>
                      {availableGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name} ({g.platform})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('keys:create.ipWhitelist')}</label>
                  <textarea
                    value={ipWhitelistText}
                    onChange={(e) => setIpWhitelistText(e.target.value)}
                    placeholder={t('keys:create.ipPlaceholder')}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:border-[var(--focus-ring)] focus:outline-none resize-none h-16"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('keys:create.ipBlacklist')}</label>
                  <textarea
                    value={ipBlacklistText}
                    onChange={(e) => setIpBlacklistText(e.target.value)}
                    placeholder={t('keys:create.ipPlaceholder')}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:border-[var(--focus-ring)] focus:outline-none resize-none h-16"
                  />
                </div>
              </div>
            </div>

            {/* Limits */}
            <div className="border-t border-[var(--border-color)] pt-4">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{t('keys:create.limits')}</p>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('keys:create.expiresAt')}
                  type="datetime-local"
                  value={newKeyData.expires_at || ''}
                  onChange={(e) => setNewKeyData({ ...newKeyData, expires_at: e.target.value })}
                />
                <Input
                  label={t('keys:create.quotaLimit')}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={t('keys:create.noLimit')}
                  value={newKeyData.quota_limit_usd || ''}
                  onChange={(e) => setNewKeyData({ ...newKeyData, quota_limit_usd: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>
            </div>

            {/* Billing */}
            <div className="border-t border-[var(--border-color)] pt-4">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{t('keys:create.billing')}</p>
              <div className="space-y-3">
                <ToggleSwitch
                  checked={newKeyData.allow_balance ?? true}
                  onChange={(v) => setNewKeyData({ ...newKeyData, allow_balance: v })}
                  label={t('keys:create.allowBalance')}
                />
                <ToggleSwitch
                  checked={newKeyData.allow_subscription ?? true}
                  onChange={(v) => setNewKeyData({ ...newKeyData, allow_subscription: v })}
                  label={t('keys:create.allowSubscription')}
                />
                <ToggleSwitch
                  checked={newKeyData.subscription_strict ?? false}
                  onChange={(v) => setNewKeyData({ ...newKeyData, subscription_strict: v })}
                  label={t('keys:create.subscriptionStrict')}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditKeyData({});
        }}
        title={t('keys:edit.title')}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditKeyData({});
              }}
            >
              {t('common:btn.cancel')}
            </Button>
            <Button variant="primary" onClick={handleUpdate}>
              {t('common:btn.saveChanges')}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{t('keys:create.basicInfo')}</p>
            <div className="space-y-4">
              <Input
                label={t('keys:create.name')}
                value={editKeyData.name || ''}
                onChange={(e) => setEditKeyData({ ...editKeyData, name: e.target.value })}
                placeholder={t('keys:create.namePlaceholder')}
              />
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('keys:edit.status')}</label>
                <select
                  value={editKeyData.status || 'active'}
                  onChange={(e) => setEditKeyData({ ...editKeyData, status: e.target.value })}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:border-[var(--focus-ring)] focus:outline-none"
                >
                  <option value="active">{t('keys:edit.statusActive')}</option>
                  <option value="disabled">{t('keys:edit.statusDisabled')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Access Control */}
          <div className="border-t border-[var(--border-color)] pt-4">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{t('keys:create.accessControl')}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('keys:create.ipWhitelist')}</label>
                <textarea
                  value={editIpWhitelistText}
                  onChange={(e) => setEditIpWhitelistText(e.target.value)}
                  placeholder={t('keys:create.ipPlaceholder')}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:border-[var(--focus-ring)] focus:outline-none resize-none h-16"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('keys:create.ipBlacklist')}</label>
                <textarea
                  value={editIpBlacklistText}
                  onChange={(e) => setEditIpBlacklistText(e.target.value)}
                  placeholder={t('keys:create.ipPlaceholder')}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:border-[var(--focus-ring)] focus:outline-none resize-none h-16"
                />
              </div>
            </div>
          </div>

          {/* Limits */}
          <div className="border-t border-[var(--border-color)] pt-4">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{t('keys:create.limits')}</p>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('keys:create.expiresAt')}
                type="datetime-local"
                value={editKeyData.expires_at || ''}
                onChange={(e) => setEditKeyData({ ...editKeyData, expires_at: e.target.value })}
              />
              <Input
                label={t('keys:create.quotaLimit')}
                type="number"
                step="0.01"
                min="0"
                placeholder={t('keys:create.noLimit')}
                value={editKeyData.quota_limit_usd || ''}
                onChange={(e) => setEditKeyData({ ...editKeyData, quota_limit_usd: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
            </div>
          </div>

          {/* Billing */}
          <div className="border-t border-[var(--border-color)] pt-4">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{t('keys:create.billing')}</p>
            <div className="space-y-3">
              <ToggleSwitch
                checked={editKeyData.allow_balance ?? true}
                onChange={(v) => setEditKeyData({ ...editKeyData, allow_balance: v })}
                label={t('keys:create.allowBalance')}
              />
              <ToggleSwitch
                checked={editKeyData.allow_subscription ?? true}
                onChange={(v) => setEditKeyData({ ...editKeyData, allow_subscription: v })}
                label={t('keys:create.allowSubscription')}
              />
              <ToggleSwitch
                checked={editKeyData.subscription_strict ?? false}
                onChange={(v) => setEditKeyData({ ...editKeyData, subscription_strict: v })}
                label={t('keys:create.subscriptionStrict')}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedKey(null);
        }}
        title={t('keys:delete.title')}
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedKey(null);
              }}
            >
              {t('common:btn.cancel')}
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              {t('common:btn.delete')}
            </Button>
          </div>
        }
      >
        <p className="text-[var(--text-secondary)]">
          {t('keys:delete.confirm', { name: selectedKey?.name })}
        </p>
      </Modal>
    </div>
  );
};

export default ApiKeysPage;
