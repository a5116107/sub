import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import {
  adminOpsApi,
  type AdvancedSettings,
  type EmailNotificationConfig,
  type RuntimeAlertConfig,
  type MetricThresholds,
} from '../../../api/admin/ops';
import {
  Button,
  Card,
  CardContent,
  Input,
} from '../../../components/ui';

export const OpsSettingsTab: React.FC = () => {
  const { t } = useTranslation('admin');
  const [loading, setLoading] = useState(true);

  // Settings states
  const [advanced, setAdvanced] = useState<AdvancedSettings | null>(null);
  const [email, setEmail] = useState<EmailNotificationConfig | null>(null);
  const [runtime, setRuntime] = useState<RuntimeAlertConfig | null>(null);
  const [thresholds, setThresholds] = useState<MetricThresholds | null>(null);

  // Save loading states
  const [savingAdvanced, setSavingAdvanced] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingRuntime, setSavingRuntime] = useState(false);
  const [savingThresholds, setSavingThresholds] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [advRes, emailRes, runtimeRes, threshRes] = await Promise.all([
        adminOpsApi.getAdvancedSettings().catch(() => null),
        adminOpsApi.getEmailNotificationConfig().catch(() => null),
        adminOpsApi.getRuntimeAlertConfig().catch(() => null),
        adminOpsApi.getMetricThresholds().catch(() => null),
      ]);
      setAdvanced(advRes);
      setEmail(emailRes);
      setRuntime(runtimeRes);
      setThresholds(threshRes);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveAdvanced = async () => {
    if (!advanced) return;
    setSavingAdvanced(true);
    try {
      const result = await adminOpsApi.updateAdvancedSettings(advanced);
      setAdvanced(result);
    } catch (error) {
      console.error('Failed to save advanced settings:', error);
    } finally {
      setSavingAdvanced(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!email) return;
    setSavingEmail(true);
    try {
      const result = await adminOpsApi.updateEmailNotificationConfig(email);
      setEmail(result);
    } catch (error) {
      console.error('Failed to save email config:', error);
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSaveRuntime = async () => {
    if (!runtime) return;
    setSavingRuntime(true);
    try {
      const result = await adminOpsApi.updateRuntimeAlertConfig(runtime);
      setRuntime(result);
    } catch (error) {
      console.error('Failed to save runtime config:', error);
    } finally {
      setSavingRuntime(false);
    }
  };

  const handleSaveThresholds = async () => {
    if (!thresholds) return;
    setSavingThresholds(true);
    try {
      const result = await adminOpsApi.updateMetricThresholds(thresholds);
      setThresholds(result);
    } catch (error) {
      console.error('Failed to save thresholds:', error);
    } finally {
      setSavingThresholds(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Advanced Settings */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">{t('ops.settings.advanced.title')}</h3>
            <Button size="sm" onClick={handleSaveAdvanced} isLoading={savingAdvanced}>
              <Save className="w-4 h-4 mr-2" />
              {t('ops.settings.save')}
            </Button>
          </div>
          {advanced ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('ops.settings.advanced.maxRetries')}</label>
                <Input
                  type="number"
                  min="0"
                  value={advanced.max_retries}
                  onChange={(e) => setAdvanced({ ...advanced, max_retries: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('ops.settings.advanced.retryDelay')}</label>
                <Input
                  type="number"
                  min="0"
                  value={advanced.retry_delay_ms}
                  onChange={(e) => setAdvanced({ ...advanced, retry_delay_ms: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('ops.settings.advanced.timeout')}</label>
                <Input
                  type="number"
                  min="1"
                  value={advanced.timeout_seconds}
                  onChange={(e) => setAdvanced({ ...advanced, timeout_seconds: parseInt(e.target.value) || 30 })}
                />
              </div>
              <div className="flex items-center gap-3 col-span-2 lg:col-span-3">
                <button
                  onClick={() => setAdvanced({ ...advanced, enable_circuit_breaker: !advanced.enable_circuit_breaker })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    advanced.enable_circuit_breaker ? 'bg-cyan-500' : 'bg-[#2A2A30]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      advanced.enable_circuit_breaker ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-300">{t('ops.settings.advanced.circuitBreaker')}</span>
              </div>
              {advanced.enable_circuit_breaker && (
                <>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('ops.settings.advanced.cbThreshold')}</label>
                    <Input
                      type="number"
                      min="1"
                      value={advanced.circuit_breaker_threshold}
                      onChange={(e) => setAdvanced({ ...advanced, circuit_breaker_threshold: parseInt(e.target.value) || 5 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('ops.settings.advanced.cbTimeout')}</label>
                    <Input
                      type="number"
                      min="1000"
                      value={advanced.circuit_breaker_timeout_ms}
                      onChange={(e) => setAdvanced({ ...advanced, circuit_breaker_timeout_ms: parseInt(e.target.value) || 30000 })}
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">{t('ops.settings.noData')}</p>
          )}
        </CardContent>
      </Card>

      {/* Email Notification Config */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">{t('ops.settings.email.title')}</h3>
            <Button size="sm" onClick={handleSaveEmail} isLoading={savingEmail}>
              <Save className="w-4 h-4 mr-2" />
              {t('ops.settings.save')}
            </Button>
          </div>
          {email ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEmail({ ...email, enabled: !email.enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    email.enabled ? 'bg-cyan-500' : 'bg-[#2A2A30]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      email.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-300">{t('ops.settings.email.enabled')}</span>
              </div>
              {email.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('ops.settings.email.smtpHost')}</label>
                    <Input
                      placeholder="smtp.example.com"
                      value={email.smtp_host || ''}
                      onChange={(e) => setEmail({ ...email, smtp_host: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('ops.settings.email.smtpPort')}</label>
                    <Input
                      type="number"
                      placeholder="587"
                      value={email.smtp_port || ''}
                      onChange={(e) => setEmail({ ...email, smtp_port: parseInt(e.target.value) || undefined })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('ops.settings.email.smtpUser')}</label>
                    <Input
                      placeholder="user@example.com"
                      value={email.smtp_user || ''}
                      onChange={(e) => setEmail({ ...email, smtp_user: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('ops.settings.email.smtpPassword')}</label>
                    <Input
                      type="password"
                      placeholder="********"
                      value={email.smtp_password || ''}
                      onChange={(e) => setEmail({ ...email, smtp_password: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('ops.settings.email.fromAddress')}</label>
                    <Input
                      placeholder="alerts@example.com"
                      value={email.from_address || ''}
                      onChange={(e) => setEmail({ ...email, from_address: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('ops.settings.email.toAddresses')}</label>
                    <Input
                      placeholder="admin@example.com, ops@example.com"
                      value={(email.to_addresses || []).join(', ')}
                      onChange={(e) => setEmail({ ...email, to_addresses: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">{t('ops.settings.noData')}</p>
          )}
        </CardContent>
      </Card>

      {/* Runtime Alert Config */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">{t('ops.settings.runtime.title')}</h3>
            <Button size="sm" onClick={handleSaveRuntime} isLoading={savingRuntime}>
              <Save className="w-4 h-4 mr-2" />
              {t('ops.settings.save')}
            </Button>
          </div>
          {runtime ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRuntime({ ...runtime, enabled: !runtime.enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    runtime.enabled ? 'bg-cyan-500' : 'bg-[#2A2A30]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      runtime.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-300">{t('ops.settings.runtime.enabled')}</span>
              </div>
              {runtime.enabled && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <label className="block text-sm text-gray-400 mb-1">{t('ops.settings.runtime.webhookUrl')}</label>
                    <Input
                      placeholder="https://hooks.example.com/alerts"
                      value={runtime.webhook_url || ''}
                      onChange={(e) => setRuntime({ ...runtime, webhook_url: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('ops.settings.runtime.errorRateThreshold')}</label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="5.0"
                      value={runtime.alert_on_error_rate ?? ''}
                      onChange={(e) => setRuntime({ ...runtime, alert_on_error_rate: parseFloat(e.target.value) || undefined })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t('ops.settings.runtime.latencyThreshold')}</label>
                    <Input
                      type="number"
                      placeholder="5000"
                      value={runtime.alert_on_latency_ms ?? ''}
                      onChange={(e) => setRuntime({ ...runtime, alert_on_latency_ms: parseInt(e.target.value) || undefined })}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">{t('ops.settings.noData')}</p>
          )}
        </CardContent>
      </Card>

      {/* Metric Thresholds */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">{t('ops.settings.thresholds.title')}</h3>
            <Button size="sm" onClick={handleSaveThresholds} isLoading={savingThresholds}>
              <Save className="w-4 h-4 mr-2" />
              {t('ops.settings.save')}
            </Button>
          </div>
          {thresholds ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('ops.settings.thresholds.cpu')}</label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={thresholds.cpu_threshold}
                  onChange={(e) => setThresholds({ ...thresholds, cpu_threshold: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('ops.settings.thresholds.memory')}</label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={thresholds.memory_threshold}
                  onChange={(e) => setThresholds({ ...thresholds, memory_threshold: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('ops.settings.thresholds.disk')}</label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={thresholds.disk_threshold}
                  onChange={(e) => setThresholds({ ...thresholds, disk_threshold: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('ops.settings.thresholds.errorRate')}</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={thresholds.error_rate_threshold}
                  onChange={(e) => setThresholds({ ...thresholds, error_rate_threshold: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('ops.settings.thresholds.latency')}</label>
                <Input
                  type="number"
                  min="0"
                  value={thresholds.latency_threshold_ms}
                  onChange={(e) => setThresholds({ ...thresholds, latency_threshold_ms: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">{t('ops.settings.noData')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OpsSettingsTab;
