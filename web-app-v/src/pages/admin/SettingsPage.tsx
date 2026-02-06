import React, { useEffect, useState, useCallback } from 'react';
import {
  Settings,
  Save,
  Mail,
  Key,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  AlertTriangle,
  Shield,
  Timer,
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import type { SystemSettings } from '../../types';
import {
  Button,
  Card,
  CardContent,
  Input,
  Modal,
  Skeleton,
} from '../../components/ui';

interface StreamTimeoutSettings {
  stream_timeout_seconds: number;
  idle_timeout_seconds: number;
  max_timeout_seconds: number;
}

interface AdminApiKeyInfo {
  key?: string;
  created_at?: string;
  last_used_at?: string;
}

export const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [formData, setFormData] = useState<Partial<SystemSettings>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Stream Timeout
  const [streamTimeout, setStreamTimeout] = useState<StreamTimeoutSettings | null>(null);
  const [streamTimeoutForm, setStreamTimeoutForm] = useState<Partial<StreamTimeoutSettings>>({});
  const [savingStreamTimeout, setSavingStreamTimeout] = useState(false);
  const [hasStreamTimeoutChanges, setHasStreamTimeoutChanges] = useState(false);

  // Admin API Key
  const [adminApiKey, setAdminApiKey] = useState<AdminApiKeyInfo | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // SMTP Test
  const [showSmtpTestModal, setShowSmtpTestModal] = useState(false);
  const [smtpTestEmail, setSmtpTestEmail] = useState('');
  const [smtpTestLoading, setSmtpTestLoading] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Test Email
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // Regenerate API Key Modal
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState(false);

  // Delete API Key Modal
  const [showDeleteKeyModal, setShowDeleteKeyModal] = useState(false);
  const [deletingKey, setDeletingKey] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [data, timeoutData, apiKeyData] = await Promise.all([
        adminApi.getSettings(),
        adminApi.getStreamTimeout(),
        adminApi.getAdminApiKey(),
      ]);
      setSettings(data);
      setFormData(data);
      setStreamTimeout(timeoutData);
      setStreamTimeoutForm(timeoutData);
      setAdminApiKey(apiKeyData);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      const changed = JSON.stringify(formData) !== JSON.stringify(settings);
      setHasChanges(changed);
    }
  }, [formData, settings]);

  useEffect(() => {
    if (streamTimeout) {
      const changed = JSON.stringify(streamTimeoutForm) !== JSON.stringify(streamTimeout);
      setHasStreamTimeoutChanges(changed);
    }
  }, [streamTimeoutForm, streamTimeout]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const updated = await adminApi.updateSettings(formData);
      setSettings(updated);
      setFormData(updated);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStreamTimeout = async () => {
    setSavingStreamTimeout(true);
    try {
      const updated = await adminApi.updateStreamTimeout(streamTimeoutForm);
      setStreamTimeout(updated);
      setStreamTimeoutForm(updated);
      setHasStreamTimeoutChanges(false);
    } catch (error) {
      console.error('Failed to save stream timeout:', error);
    } finally {
      setSavingStreamTimeout(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!smtpTestEmail) return;

    setSmtpTestLoading(true);
    setSmtpTestResult(null);
    try {
      await adminApi.testSMTP({ to: smtpTestEmail });
      setSmtpTestResult({ success: true, message: 'SMTP configuration test passed!' });
    } catch (error) {
      setSmtpTestResult({ success: false, message: 'SMTP test failed. Please check your configuration.' });
    } finally {
      setSmtpTestLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) return;

    setTestEmailLoading(true);
    setTestEmailResult(null);
    try {
      await adminApi.sendTestEmail({ to: testEmail });
      setTestEmailResult({ success: true, message: 'Test email sent successfully!' });
    } catch (error) {
      setTestEmailResult({ success: false, message: 'Failed to send test email' });
    } finally {
      setTestEmailLoading(false);
    }
  };

  const handleRegenerateApiKey = async () => {
    setRegeneratingKey(true);
    try {
      const data = await adminApi.regenerateAdminApiKey();
      setAdminApiKey(data);
      setShowRegenerateModal(false);
      setShowApiKey(true);
    } catch (error) {
      console.error('Failed to regenerate API key:', error);
    } finally {
      setRegeneratingKey(false);
    }
  };

  const handleDeleteApiKey = async () => {
    setDeletingKey(true);
    try {
      await adminApi.deleteAdminApiKey();
      setAdminApiKey({});
      setShowDeleteKeyModal(false);
    } catch (error) {
      console.error('Failed to delete API key:', error);
    } finally {
      setDeletingKey(false);
    }
  };

  const handleCopyApiKey = () => {
    if (adminApiKey?.key) {
      navigator.clipboard.writeText(adminApiKey.key);
    }
  };

  const handleResetForm = () => {
    if (settings) {
      setFormData(settings);
    }
  };

  const handleResetStreamTimeout = () => {
    if (streamTimeout) {
      setStreamTimeoutForm(streamTimeout);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <Skeleton height={32} width={200} />
          <Skeleton height={20} width={300} className="mt-2" />
        </div>
        <div className="space-y-6">
          <Skeleton height={200} />
          <Skeleton height={200} />
          <Skeleton height={200} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">System Settings</h1>
          <p className="text-gray-400">Configure system-wide settings</p>
        </div>
        <div className="flex gap-3">
          {hasChanges && (
            <Button variant="secondary" onClick={handleResetForm}>
              Reset
            </Button>
          )}
          <Button onClick={handleSaveSettings} isLoading={saving} disabled={!hasChanges}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-medium text-white">General Settings</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Site Name</label>
                <Input
                  placeholder="My API Service"
                  value={formData.site_name || ''}
                  onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Site Description</label>
                <Input
                  placeholder="API service description"
                  value={formData.site_description || ''}
                  onChange={(e) => setFormData({ ...formData, site_description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="registration_enabled"
                    checked={formData.registration_enabled || false}
                    onChange={(e) => setFormData({ ...formData, registration_enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-[#2A2A30] bg-[#0A0A0C] text-cyan-500 focus:ring-cyan-500"
                  />
                  <label htmlFor="registration_enabled" className="text-sm text-gray-400">
                    Enable Registration
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="email_verification_required"
                    checked={formData.email_verification_required || false}
                    onChange={(e) => setFormData({ ...formData, email_verification_required: e.target.checked })}
                    className="w-4 h-4 rounded border-[#2A2A30] bg-[#0A0A0C] text-cyan-500 focus:ring-cyan-500"
                  />
                  <label htmlFor="email_verification_required" className="text-sm text-gray-400">
                    Require Email Verification
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Default User Settings */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Key className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-medium text-white">Default User Settings</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Default Concurrency</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="5"
                  value={formData.default_user_concurrency || ''}
                  onChange={(e) => setFormData({ ...formData, default_user_concurrency: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-gray-500 mt-1">Max concurrent requests for new users</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Default Balance (USD)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.default_user_balance || ''}
                  onChange={(e) => setFormData({ ...formData, default_user_balance: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-gray-500 mt-1">Initial balance for new users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stream Timeout Settings */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-medium text-white">Stream Timeout Settings</h2>
              </div>
              <div className="flex gap-2">
                {hasStreamTimeoutChanges && (
                  <Button variant="secondary" size="sm" onClick={handleResetStreamTimeout}>
                    Reset
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSaveStreamTimeout}
                  isLoading={savingStreamTimeout}
                  disabled={!hasStreamTimeoutChanges}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Stream Timeout (seconds)</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="300"
                  value={streamTimeoutForm.stream_timeout_seconds || ''}
                  onChange={(e) => setStreamTimeoutForm({
                    ...streamTimeoutForm,
                    stream_timeout_seconds: parseInt(e.target.value) || 0
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">Max time for stream responses</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Idle Timeout (seconds)</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="60"
                  value={streamTimeoutForm.idle_timeout_seconds || ''}
                  onChange={(e) => setStreamTimeoutForm({
                    ...streamTimeoutForm,
                    idle_timeout_seconds: parseInt(e.target.value) || 0
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">Timeout for idle connections</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Max Timeout (seconds)</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="600"
                  value={streamTimeoutForm.max_timeout_seconds || ''}
                  onChange={(e) => setStreamTimeoutForm({
                    ...streamTimeoutForm,
                    max_timeout_seconds: parseInt(e.target.value) || 0
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">Absolute maximum timeout</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin API Key */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-medium text-white">Admin API Key</h2>
            </div>
            <div className="space-y-4">
              {adminApiKey?.key ? (
                <>
                  <div className="p-4 bg-[#0A0A0C] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">API Key</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="p-1 text-gray-500 hover:text-white transition-colors"
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={handleCopyApiKey}
                          className="p-1 text-gray-500 hover:text-white transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="font-mono text-sm text-gray-300 break-all">
                      {showApiKey ? adminApiKey.key : '•'.repeat(adminApiKey.key.length)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Created:</span>{' '}
                      <span className="text-gray-300">
                        {adminApiKey.created_at ? new Date(adminApiKey.created_at).toLocaleString() : 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Last Used:</span>{' '}
                      <span className="text-gray-300">
                        {adminApiKey.last_used_at
                          ? new Date(adminApiKey.last_used_at).toLocaleString()
                          : 'Never'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowRegenerateModal(true)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setShowDeleteKeyModal(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No admin API key configured</p>
                  <Button
                    variant="secondary"
                    onClick={() => setShowRegenerateModal(true)}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Generate API Key
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-medium text-white">Email Settings</h2>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              SMTP settings are configured via environment variables. Use the test buttons to verify your configuration.
            </p>
            <div className="p-4 bg-[#0A0A0C] rounded-lg mb-4">
              <p className="text-xs text-gray-500 font-mono">
                SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowSmtpTestModal(true)}
              >
                <Mail className="w-4 h-4 mr-2" />
                Test SMTP
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowTestEmailModal(true)}
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Test Email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SMTP Test Modal */}
      <Modal
        isOpen={showSmtpTestModal}
        onClose={() => {
          setShowSmtpTestModal(false);
          setSmtpTestEmail('');
          setSmtpTestResult(null);
        }}
        title="Test SMTP Configuration"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Recipient Email</label>
            <Input
              type="email"
              placeholder="test@example.com"
              value={smtpTestEmail}
              onChange={(e) => setSmtpTestEmail(e.target.value)}
            />
          </div>

          {smtpTestResult && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              smtpTestResult.success ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'
            }`}>
              {smtpTestResult.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              <p className={smtpTestResult.success ? 'text-emerald-400' : 'text-red-400'}>
                {smtpTestResult.message}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowSmtpTestModal(false);
                setSmtpTestEmail('');
                setSmtpTestResult(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTestSmtp}
              isLoading={smtpTestLoading}
              disabled={!smtpTestEmail}
            >
              Test SMTP
            </Button>
          </div>
        </div>
      </Modal>

      {/* Test Email Modal */}
      <Modal
        isOpen={showTestEmailModal}
        onClose={() => {
          setShowTestEmailModal(false);
          setTestEmail('');
          setTestEmailResult(null);
        }}
        title="Send Test Email"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Recipient Email</label>
            <Input
              type="email"
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>

          {testEmailResult && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              testEmailResult.success ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'
            }`}>
              {testEmailResult.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              <p className={testEmailResult.success ? 'text-emerald-400' : 'text-red-400'}>
                {testEmailResult.message}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowTestEmailModal(false);
                setTestEmail('');
                setTestEmailResult(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendTestEmail}
              isLoading={testEmailLoading}
              disabled={!testEmail}
            >
              Send Test Email
            </Button>
          </div>
        </div>
      </Modal>

      {/* Regenerate API Key Modal */}
      <Modal
        isOpen={showRegenerateModal}
        onClose={() => setShowRegenerateModal(false)}
        title="Regenerate Admin API Key"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-400">Warning</p>
              <p className="text-sm text-gray-400 mt-1">
                Regenerating the API key will invalidate the existing key immediately.
                Any applications using the current key will need to be updated.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowRegenerateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRegenerateApiKey}
              isLoading={regeneratingKey}
              variant="danger"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate Key
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete API Key Modal */}
      <Modal
        isOpen={showDeleteKeyModal}
        onClose={() => setShowDeleteKeyModal(false)}
        title="Delete Admin API Key"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-400">Warning</p>
              <p className="text-sm text-gray-400 mt-1">
                Deleting the API key will immediately revoke access for any applications using it.
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowDeleteKeyModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteApiKey}
              isLoading={deletingKey}
              variant="danger"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Key
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsPage;
