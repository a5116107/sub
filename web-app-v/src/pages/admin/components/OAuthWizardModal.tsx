import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ExternalLink,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  Button,
  Input,
  Badge,
  Modal,
} from '../../../components/ui';
import {
  adminOpenAIOAuthApi,
  adminQwenOAuthApi,
  adminGeminiOAuthApi,
  adminAntigravityOAuthApi,
  adminClaudeOAuthApi,
} from '../../../api/admin/oauth';

type ProviderType = 'openai' | 'qwen' | 'gemini' | 'antigravity' | 'claude';
type ClaudeSubTab = 'oauth' | 'setupToken' | 'cookie';

interface OAuthWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  groupId: string;
}

export const OAuthWizardModal: React.FC<OAuthWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation('admin');
  const [activeProvider, setActiveProvider] = useState<ProviderType>('openai');
  const [activeClaudeTab, setActiveClaudeTab] = useState<ClaudeSubTab>('oauth');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState<FormData>({
    name: '',
    groupId: '',
  });

  // OAuth flow states
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [oauthState, setOauthState] = useState<string | null>(null);
  const [oauthCode, setOauthCode] = useState('');

  // Qwen device auth states
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [verificationUri, setVerificationUri] = useState<string | null>(null);
  const [pollingDevice, setPollingDevice] = useState(false);

  // Cookie auth state
  const [cookieInput, setCookieInput] = useState('');

  // Gemini capabilities
  const [geminiCapabilities, setGeminiCapabilities] = useState<{
    models: string[];
    features: string[];
  } | null>(null);

  const resetState = useCallback(() => {
    setError(null);
    setSuccess(null);
    setAuthUrl(null);
    setOauthState(null);
    setOauthCode('');
    setDeviceCode(null);
    setUserCode(null);
    setVerificationUri(null);
    setPollingDevice(false);
    setCookieInput('');
    setGeminiCapabilities(null);
    setFormData({ name: '', groupId: '' });
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  // OpenAI OAuth flow
  const handleOpenAIGenerateUrl = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminOpenAIOAuthApi.generateAuthUrl();
      setAuthUrl(response.url);
      setOauthState(response.state);
    } catch (err) {
      setError(t('oauth.error.generateUrlFailed'));
      console.error('Failed to generate auth URL:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAIExchangeCode = async () => {
    if (!oauthCode) return;
    setLoading(true);
    setError(null);
    try {
      const tokenResponse = await adminOpenAIOAuthApi.exchangeCode(oauthCode, oauthState || undefined);
      const expiresAt = tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
        : undefined;

      await adminOpenAIOAuthApi.createFromOAuth({
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        expires_at: expiresAt,
        name: formData.name || undefined,
        group_id: formData.groupId ? parseInt(formData.groupId) : undefined,
      });

      setSuccess(t('oauth.success.accountCreated'));
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err) {
      setError(t('oauth.error.exchangeFailed'));
      console.error('Failed to exchange code:', err);
    } finally {
      setLoading(false);
    }
  };

  // Qwen device auth flow
  const handleQwenStartDeviceAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminQwenOAuthApi.startDeviceAuth();
      setDeviceCode(response.device_code);
      setUserCode(response.user_code);
      setVerificationUri(response.verification_uri);
      setPollingDevice(true);
    } catch (err) {
      setError(t('oauth.error.deviceAuthFailed'));
      console.error('Failed to start device auth:', err);
    } finally {
      setLoading(false);
    }
  };

  // Poll for Qwen device auth completion
  useEffect(() => {
    if (!pollingDevice || !deviceCode) return;

    const poll = async () => {
      try {
        const response = await adminQwenOAuthApi.pollDeviceAuth(deviceCode);
        if (response.success && response.access_token) {
          setPollingDevice(false);
          const expiresAt = response.expires_in
            ? new Date(Date.now() + response.expires_in * 1000).toISOString()
            : undefined;

          await adminQwenOAuthApi.createFromDevice({
            access_token: response.access_token,
            refresh_token: response.refresh_token,
            expires_at: expiresAt,
            name: formData.name || undefined,
            group_id: formData.groupId ? parseInt(formData.groupId) : undefined,
          });

          setSuccess(t('oauth.success.accountCreated'));
          setTimeout(() => {
            onSuccess();
            handleClose();
          }, 1500);
        }
      } catch (err) {
        // Continue polling on error
        console.log('Polling...', err);
      }
    };

    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [pollingDevice, deviceCode, formData, onSuccess, handleClose, t]);

  // Gemini OAuth flow
  const handleGeminiGetCapabilities = async () => {
    setLoading(true);
    setError(null);
    try {
      const caps = await adminGeminiOAuthApi.getCapabilities();
      setGeminiCapabilities(caps);
    } catch (err) {
      setError(t('oauth.error.capabilitiesFailed'));
      console.error('Failed to get capabilities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeminiGenerateUrl = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminGeminiOAuthApi.generateAuthUrl();
      setAuthUrl(response.url);
      setOauthState(response.state);
    } catch (err) {
      setError(t('oauth.error.generateUrlFailed'));
      console.error('Failed to generate auth URL:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeminiExchangeCode = async () => {
    if (!oauthCode) return;
    setLoading(true);
    setError(null);
    try {
      await adminGeminiOAuthApi.exchangeCode(oauthCode, oauthState || undefined);
      setSuccess(t('oauth.success.accountCreated'));
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err) {
      setError(t('oauth.error.exchangeFailed'));
      console.error('Failed to exchange code:', err);
    } finally {
      setLoading(false);
    }
  };

  // Antigravity OAuth flow
  const handleAntigravityGenerateUrl = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminAntigravityOAuthApi.generateAuthUrl();
      setAuthUrl(response.url);
      setOauthState(response.state);
    } catch (err) {
      setError(t('oauth.error.generateUrlFailed'));
      console.error('Failed to generate auth URL:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAntigravityExchangeCode = async () => {
    if (!oauthCode) return;
    setLoading(true);
    setError(null);
    try {
      await adminAntigravityOAuthApi.exchangeCode(oauthCode, oauthState || undefined);
      setSuccess(t('oauth.success.accountCreated'));
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err) {
      setError(t('oauth.error.exchangeFailed'));
      console.error('Failed to exchange code:', err);
    } finally {
      setLoading(false);
    }
  };

  // Claude OAuth flow
  const handleClaudeGenerateUrl = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminClaudeOAuthApi.generateAuthUrl();
      setAuthUrl(response.url);
      setOauthState(response.state);
    } catch (err) {
      setError(t('oauth.error.generateUrlFailed'));
      console.error('Failed to generate auth URL:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaudeExchangeCode = async () => {
    if (!oauthCode) return;
    setLoading(true);
    setError(null);
    try {
      await adminClaudeOAuthApi.exchangeCode(oauthCode, oauthState || undefined);
      setSuccess(t('oauth.success.accountCreated'));
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err) {
      setError(t('oauth.error.exchangeFailed'));
      console.error('Failed to exchange code:', err);
    } finally {
      setLoading(false);
    }
  };

  // Claude Setup Token flow
  const handleClaudeGenerateSetupTokenUrl = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminClaudeOAuthApi.generateSetupTokenUrl();
      setAuthUrl(response.url);
      setOauthState(response.state);
    } catch (err) {
      setError(t('oauth.error.generateUrlFailed'));
      console.error('Failed to generate setup token URL:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaudeExchangeSetupTokenCode = async () => {
    if (!oauthCode) return;
    setLoading(true);
    setError(null);
    try {
      await adminClaudeOAuthApi.exchangeSetupTokenCode(oauthCode, oauthState || undefined);
      setSuccess(t('oauth.success.accountCreated'));
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err) {
      setError(t('oauth.error.exchangeFailed'));
      console.error('Failed to exchange setup token code:', err);
    } finally {
      setLoading(false);
    }
  };

  // Claude Cookie auth
  const handleClaudeCookieAuth = async () => {
    if (!cookieInput) return;
    setLoading(true);
    setError(null);
    try {
      await adminClaudeOAuthApi.cookieAuth({ cookies: cookieInput });
      setSuccess(t('oauth.success.accountCreated'));
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err) {
      setError(t('oauth.error.cookieAuthFailed'));
      console.error('Failed to authenticate with cookie:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaudeSetupTokenCookieAuth = async () => {
    if (!cookieInput) return;
    setLoading(true);
    setError(null);
    try {
      await adminClaudeOAuthApi.setupTokenCookieAuth({ cookies: cookieInput });
      setSuccess(t('oauth.success.accountCreated'));
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err) {
      setError(t('oauth.error.cookieAuthFailed'));
      console.error('Failed to authenticate with setup token cookie:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const providers: { key: ProviderType; label: string; color: string }[] = [
    { key: 'openai', label: 'OpenAI', color: 'text-emerald-400' },
    { key: 'qwen', label: 'Qwen', color: 'text-purple-400' },
    { key: 'gemini', label: 'Gemini', color: 'text-blue-400' },
    { key: 'antigravity', label: 'Antigravity', color: 'text-amber-400' },
    { key: 'claude', label: 'Claude', color: 'text-cyan-400' },
  ];

  const renderProviderTabs = () => (
    <div className="flex flex-wrap gap-2 mb-6">
      {providers.map((provider) => (
        <button
          key={provider.key}
          onClick={() => {
            setActiveProvider(provider.key);
            resetState();
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeProvider === provider.key
              ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30'
              : 'bg-[#1A1A1F] text-gray-400 border border-[#2A2A30] hover:text-white hover:border-[#3A3A40]'
          }`}
        >
          {provider.label}
        </button>
      ))}
    </div>
  );

  const renderCommonForm = () => (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          {t('oauth.form.name')}
        </label>
        <Input
          placeholder={t('oauth.form.namePlaceholder')}
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          {t('oauth.form.groupId')}
        </label>
        <Input
          type="number"
          placeholder={t('oauth.form.groupIdPlaceholder')}
          value={formData.groupId}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, groupId: e.target.value })}
        />
      </div>
    </div>
  );

  const renderOpenAIFlow = () => (
    <div className="space-y-4">
      {!authUrl ? (
        <>
          {renderCommonForm()}
          <Button
            onClick={handleOpenAIGenerateUrl}
            isLoading={loading}
            className="w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {t('oauth.action.generateAuthUrl')}
          </Button>
        </>
      ) : (
        <>
          <div className="p-4 bg-[#0A0A0C] border border-[#2A2A30] rounded-lg">
            <p className="text-sm text-gray-400 mb-2">{t('oauth.instruction.openUrl')}</p>
            <a
              href={authUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00F0FF] hover:underline text-sm break-all"
            >
              {authUrl}
            </a>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {t('oauth.form.authCode')}
            </label>
            <Input
              placeholder={t('oauth.form.authCodePlaceholder')}
              value={oauthCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOauthCode(e.target.value)}
            />
          </div>
          <Button
            onClick={handleOpenAIExchangeCode}
            isLoading={loading}
            disabled={!oauthCode}
            className="w-full"
          >
            {t('oauth.action.createAccount')}
          </Button>
        </>
      )}
    </div>
  );

  const renderQwenFlow = () => (
    <div className="space-y-4">
      {!deviceCode ? (
        <>
          {renderCommonForm()}
          <Button
            onClick={handleQwenStartDeviceAuth}
            isLoading={loading}
            className="w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {t('oauth.action.startDeviceAuth')}
          </Button>
        </>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-[#0A0A0C] border border-[#2A2A30] rounded-lg text-center">
            <p className="text-sm text-gray-400 mb-3">{t('oauth.instruction.visitAndEnter')}</p>
            <a
              href={verificationUri || ''}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00F0FF] hover:underline text-sm block mb-4"
            >
              {verificationUri}
            </a>
            <div className="flex items-center justify-center gap-2">
              <code className="bg-[#1A1A1F] px-4 py-2 rounded text-2xl font-mono text-white tracking-wider">
                {userCode}
              </code>
              <button
                onClick={() => userCode && copyToClipboard(userCode)}
                className="p-2 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
                title={t('oauth.action.copy')}
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          {pollingDevice && (
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t('oauth.status.waitingForAuth')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderGeminiFlow = () => (
    <div className="space-y-4">
      {!geminiCapabilities && !authUrl && (
        <Button
          onClick={handleGeminiGetCapabilities}
          isLoading={loading}
          className="w-full"
        >
          {t('oauth.action.getCapabilities')}
        </Button>
      )}
      {geminiCapabilities && !authUrl && (
        <div className="p-4 bg-[#0A0A0C] border border-[#2A2A30] rounded-lg">
          <p className="text-sm text-gray-400 mb-2">{t('oauth.label.availableModels')}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {geminiCapabilities.models.map((model) => (
              <Badge key={model} variant="info">
                {model}
              </Badge>
            ))}
          </div>
          {renderCommonForm()}
          <Button
            onClick={handleGeminiGenerateUrl}
            isLoading={loading}
            className="w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {t('oauth.action.generateAuthUrl')}
          </Button>
        </div>
      )}
      {authUrl && (
        <>
          <div className="p-4 bg-[#0A0A0C] border border-[#2A2A30] rounded-lg">
            <p className="text-sm text-gray-400 mb-2">{t('oauth.instruction.openUrl')}</p>
            <a
              href={authUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00F0FF] hover:underline text-sm break-all"
            >
              {authUrl}
            </a>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {t('oauth.form.authCode')}
            </label>
            <Input
              placeholder={t('oauth.form.authCodePlaceholder')}
              value={oauthCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOauthCode(e.target.value)}
            />
          </div>
          <Button
            onClick={handleGeminiExchangeCode}
            isLoading={loading}
            disabled={!oauthCode}
            className="w-full"
          >
            {t('oauth.action.createAccount')}
          </Button>
        </>
      )}
    </div>
  );

  const renderAntigravityFlow = () => (
    <div className="space-y-4">
      {!authUrl ? (
        <>
          {renderCommonForm()}
          <Button
            onClick={handleAntigravityGenerateUrl}
            isLoading={loading}
            className="w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {t('oauth.action.generateAuthUrl')}
          </Button>
        </>
      ) : (
        <>
          <div className="p-4 bg-[#0A0A0C] border border-[#2A2A30] rounded-lg">
            <p className="text-sm text-gray-400 mb-2">{t('oauth.instruction.openUrl')}</p>
            <a
              href={authUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00F0FF] hover:underline text-sm break-all"
            >
              {authUrl}
            </a>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {t('oauth.form.authCode')}
            </label>
            <Input
              placeholder={t('oauth.form.authCodePlaceholder')}
              value={oauthCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOauthCode(e.target.value)}
            />
          </div>
          <Button
            onClick={handleAntigravityExchangeCode}
            isLoading={loading}
            disabled={!oauthCode}
            className="w-full"
          >
            {t('oauth.action.createAccount')}
          </Button>
        </>
      )}
    </div>
  );

  const renderClaudeFlow = () => (
    <div className="space-y-4">
      {/* Claude sub-tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'oauth', label: t('oauth.claudeTab.oauth') },
          { key: 'setupToken', label: t('oauth.claudeTab.setupToken') },
          { key: 'cookie', label: t('oauth.claudeTab.cookie') },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveClaudeTab(tab.key as ClaudeSubTab);
              resetState();
            }}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              activeClaudeTab === tab.key
                ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30'
                : 'bg-[#1A1A1F] text-gray-400 border border-[#2A2A30] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeClaudeTab === 'oauth' && (
        <>
          {!authUrl ? (
            <>
              {renderCommonForm()}
              <Button
                onClick={handleClaudeGenerateUrl}
                isLoading={loading}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('oauth.action.generateAuthUrl')}
              </Button>
            </>
          ) : (
            <>
              <div className="p-4 bg-[#0A0A0C] border border-[#2A2A30] rounded-lg">
                <p className="text-sm text-gray-400 mb-2">{t('oauth.instruction.openUrl')}</p>
                <a
                  href={authUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00F0FF] hover:underline text-sm break-all"
                >
                  {authUrl}
                </a>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  {t('oauth.form.authCode')}
                </label>
                <Input
                  placeholder={t('oauth.form.authCodePlaceholder')}
                  value={oauthCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOauthCode(e.target.value)}
                />
              </div>
              <Button
                onClick={handleClaudeExchangeCode}
                isLoading={loading}
                disabled={!oauthCode}
                className="w-full"
              >
                {t('oauth.action.createAccount')}
              </Button>
            </>
          )}
        </>
      )}

      {activeClaudeTab === 'setupToken' && (
        <>
          {!authUrl ? (
            <>
              {renderCommonForm()}
              <Button
                onClick={handleClaudeGenerateSetupTokenUrl}
                isLoading={loading}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('oauth.action.generateSetupTokenUrl')}
              </Button>
            </>
          ) : (
            <>
              <div className="p-4 bg-[#0A0A0C] border border-[#2A2A30] rounded-lg">
                <p className="text-sm text-gray-400 mb-2">{t('oauth.instruction.openUrl')}</p>
                <a
                  href={authUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00F0FF] hover:underline text-sm break-all"
                >
                  {authUrl}
                </a>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  {t('oauth.form.setupTokenCode')}
                </label>
                <Input
                  placeholder={t('oauth.form.setupTokenCodePlaceholder')}
                  value={oauthCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOauthCode(e.target.value)}
                />
              </div>
              <Button
                onClick={handleClaudeExchangeSetupTokenCode}
                isLoading={loading}
                disabled={!oauthCode}
                className="w-full"
              >
                {t('oauth.action.createAccount')}
              </Button>
            </>
          )}
        </>
      )}

      {activeClaudeTab === 'cookie' && (
        <>
          {renderCommonForm()}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {t('oauth.form.cookies')}
            </label>
            <textarea
              value={cookieInput}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCookieInput(e.target.value)}
              placeholder={t('oauth.form.cookiesPlaceholder')}
              className="w-full h-32 bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-[#00F0FF] outline-none resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleClaudeCookieAuth}
              isLoading={loading}
              disabled={!cookieInput}
              className="flex-1"
            >
              {t('oauth.action.cookieAuth')}
            </Button>
            <Button
              onClick={handleClaudeSetupTokenCookieAuth}
              isLoading={loading}
              disabled={!cookieInput}
              variant="secondary"
              className="flex-1"
            >
              {t('oauth.action.setupTokenCookieAuth')}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const renderProviderContent = () => {
    switch (activeProvider) {
      case 'openai':
        return renderOpenAIFlow();
      case 'qwen':
        return renderQwenFlow();
      case 'gemini':
        return renderGeminiFlow();
      case 'antigravity':
        return renderAntigravityFlow();
      case 'claude':
        return renderClaudeFlow();
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('oauth.modal.title')}
      size="lg"
    >
      <div className="space-y-4">
        {renderProviderTabs()}

        {/* Error/Success messages */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400">{success}</span>
          </div>
        )}

        {renderProviderContent()}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-[#2A2A30]">
          <Button variant="secondary" onClick={handleClose}>
            {t('common:btn.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default OAuthWizardModal;
