import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, AlertCircle, CheckCircle, Copy, RefreshCw } from 'lucide-react';
import { userApi } from '../../../api/user';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge } from '../../../components/ui';

export const TwoFactorPage: React.FC = () => {
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
      setMessage({ type: 'error', text: 'Please enter a valid 6-digit code' });
      return;
    }

    setProcessing(true);
    setMessage(null);

    try {
      await userApi.enableTOTP({ code: verificationCode });
      setMessage({ type: 'success', text: 'Two-factor authentication enabled successfully' });
      setStep('status');
      fetchStatus();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Invalid verification code' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDisable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a valid 6-digit code' });
      return;
    }

    setProcessing(true);
    setMessage(null);

    try {
      await userApi.disableTOTP({ code: verificationCode });
      setMessage({ type: 'success', text: 'Two-factor authentication disabled successfully' });
      setStep('status');
      setVerificationCode('');
      fetchStatus();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Invalid verification code' });
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Copied to clipboard' });
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
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Two-Factor Authentication</h1>
        <p className="text-gray-400">Add an extra layer of security to your account</p>
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
              2FA Status
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
                    {status?.enabled ? 'Enabled' : 'Disabled'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {status?.enabled
                      ? `Using ${status.method?.toUpperCase() || 'TOTP'} authenticator`
                      : 'Add extra security to your account'}
                  </p>
                </div>
              </div>
              <Badge variant={status?.enabled ? 'success' : 'default'}>
                {status?.enabled ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {status?.enabled ? (
              <Button variant="danger" onClick={() => setStep('disable')} className="w-full">
                Disable 2FA
              </Button>
            ) : (
              <Button onClick={handleSetup} disabled={processing} className="w-full">
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Setting up...
                  </>
                ) : (
                  'Enable 2FA'
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'setup' && setupData && (
        <Card>
          <CardHeader>
            <CardTitle>Setup Authenticator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-400 mb-4">Scan this QR code with your authenticator app</p>
              <div className="inline-block p-4 bg-white rounded-lg">
                <img
                  src={`data:image/png;base64,${setupData.qr_code}`}
                  alt="2FA QR Code"
                  className="w-48 h-48"
                />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-white/5">
              <p className="text-sm text-gray-400 mb-2">Or enter this secret key manually:</p>
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
                Enter verification code from your app
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
                  Cancel
                </Button>
                <Button onClick={handleVerify} disabled={processing || verificationCode.length !== 6} className="flex-1">
                  {processing ? 'Verifying...' : 'Verify & Enable'}
                </Button>
              </div>
            </div>

            {setupData.backup_codes?.length > 0 && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-400 mb-2">Save these backup codes in a safe place:</p>
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
            <CardTitle className="text-red-400">Disable Two-Factor Authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle className="w-5 h-5 mb-2" />
              <p>Warning: Disabling 2FA will make your account less secure.</p>
            </div>

            <label className="block text-sm font-medium text-gray-400 mb-2">
              Enter your 2FA code to confirm
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
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDisable}
                disabled={processing || verificationCode.length !== 6}
                className="flex-1"
              >
                {processing ? 'Disabling...' : 'Disable 2FA'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TwoFactorPage;
