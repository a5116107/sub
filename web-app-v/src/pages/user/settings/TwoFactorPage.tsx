import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, AlertCircle, CheckCircle, Copy, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { userApi } from '../../../api/user';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge } from '../../../components/ui';

export const TwoFactorPage: React.FC = () => {
  const { t } = useTranslation(['settings', 'common']);
  const [status, setStatus] = useState<{ enabled: boolean; method?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<{ secret: string; qr_code: string; backup_codes: string[] } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'status' | 'setup' | 'verify' | 'disable'>('status');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await userApi.getTOTPStatus();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch TOTP status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    setProcessing(true);
    setMessage(null);
    try {
      const data = await userApi.setupTOTP();
      setSetupData(data);
      setStep('setup');
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to setup 2FA' });
    } finally {
      setProcessing(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setMessage({ type: 'error', text: t('settings:twoFactor.invalidCode') });
      return;
    }

    setProcessing(true);
    setMessage(null);

    try {
      await userApi.enableTOTP({ code: verificationCode });
      setMessage({ type: 'success', text: t('settings:twoFactor.enableSuccess') });
      setStep('status');
      fetchStatus();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : t('settings:twoFactor.invalidCode') });
    } finally {
      setProcessing(false);
    }
  };

  const handleDisable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setMessage({ type: 'error', text: t('settings:twoFactor.invalidCode') });
      return;
    }

    setProcessing(true);
    setMessage(null);

    try {
      await userApi.disableTOTP({ code: verificationCode });
      setMessage({ type: 'success', text: t('settings:twoFactor.disableSuccess') });
      setStep('status');
      setVerificationCode('');
      fetchStatus();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : t('settings:twoFactor.invalidCode') });
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: t('settings:twoFactor.copied') });
    setTimeout(() => setMessage(null), 2000);
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-white/10 rounded w-1/3"></div>
              <div className="h-32 bg-white/10 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">{t('settings:twoFactor.title')}</h1>
        <p className="text-gray-400">{t('settings:twoFactor.subtitle')}</p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {step === 'status' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#00F0FF]" />
              {t('settings:twoFactor.status')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  status?.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white font-medium">
                    {status?.enabled ? t('settings:twoFactor.enabled') : t('settings:twoFactor.disabled')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {status?.enabled
                      ? t('settings:twoFactor.usingAuth', { method: status.method?.toUpperCase() || 'TOTP' })
                      : t('settings:twoFactor.addSecurity')}
                  </p>
                </div>
              </div>
              <Badge variant={status?.enabled ? 'success' : 'default'}>
                {status?.enabled ? t('common:status.active') : t('common:status.inactive')}
              </Badge>
            </div>

            {status?.enabled ? (
              <Button variant="danger" onClick={() => setStep('disable')} className="w-full">
                {t('settings:twoFactor.disable')}
              </Button>
            ) : (
              <Button onClick={handleSetup} disabled={processing} className="w-full">
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    {t('settings:twoFactor.settingUp')}
                  </>
                ) : (
                  t('settings:twoFactor.enable')
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'setup' && setupData && (
        <Card>
          <CardHeader>
            <CardTitle>{t('settings:twoFactor.setupTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-400 mb-4">{t('settings:twoFactor.scanQR')}</p>
              <div className="inline-block p-4 bg-white rounded-lg">
                <img
                  src={`data:image/png;base64,${setupData.qr_code}`}
                  alt="2FA QR Code"
                  className="w-48 h-48"
                />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-white/5">
              <p className="text-sm text-gray-400 mb-2">{t('settings:twoFactor.manualEntry')}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-black/30 rounded font-mono text-sm break-all">
                  {setupData.secret}
                </code>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(setupData.secret)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="border-t border-[#2A2A30] pt-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t('settings:twoFactor.enterCode')}
              </label>
              <Input
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-widest"
                maxLength={6}
              />
              <div className="flex gap-3 mt-4">
                <Button variant="ghost" onClick={() => setStep('status')} className="flex-1">
                  {t('common:btn.cancel')}
                </Button>
                <Button onClick={handleVerify} disabled={processing || verificationCode.length !== 6} className="flex-1">
                  {processing ? t('settings:twoFactor.verifying') : t('settings:twoFactor.verifyEnable')}
                </Button>
              </div>
            </div>

            {setupData.backup_codes?.length > 0 && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-400 mb-2">{t('settings:twoFactor.backupCodes')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {setupData.backup_codes.map((code, i) => (
                    <code key={i} className="text-xs font-mono text-amber-300">
                      {code}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'disable' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-400">{t('settings:twoFactor.disableTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle className="w-5 h-5 mb-2" />
              <p>{t('settings:twoFactor.disableWarning')}</p>
            </div>

            <label className="block text-sm font-medium text-gray-400 mb-2">
              {t('settings:twoFactor.confirmDisable')}
            </label>
            <Input
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="text-center text-2xl tracking-widest"
              maxLength={6}
            />

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep('status')} className="flex-1">
                {t('common:btn.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDisable}
                disabled={processing || verificationCode.length !== 6}
                className="flex-1"
              >
                {processing ? t('settings:twoFactor.disabling') : t('settings:twoFactor.disable')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TwoFactorPage;
