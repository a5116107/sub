import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Shield, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useSettingsStore } from '../../stores/settingsStore';
import { authApi } from '../../api/auth';
import { Button, Input, Card, CardContent } from '../../components/ui';

export const LoginPage: React.FC = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();
  const settings = useSettingsStore((s) => s.settings);
  const siteName = settings?.site_name || 'NEXUS';
  const oauthProviders = settings?.oauth_providers || [];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(email, password, requires2FA ? totpCode : undefined);
      navigate('/app/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('2FA')) {
        setRequires2FA(true);
      }
    }
  };

  const handleLinuxDoLogin = () => {
    setOauthLoading(true);
    authApi.startLinuxDoOAuth('/app/dashboard');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--accent-soft)] rounded-full blur-[120px]" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[120px]"
          style={{ background: 'color-mix(in oklab, var(--accent-secondary) 16%, transparent)' }}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#00F0FF] to-[#7000FF] rounded-lg blur-[2px] opacity-70" />
              <div className="relative w-full h-full bg-[var(--bg-card)] rounded-lg border border-[var(--border-color-subtle)] flex items-center justify-center">
                <div className="w-3 h-3 bg-gradient-to-tr from-[#00F0FF] to-white rounded-sm rotate-45" />
              </div>
            </div>
            <span className="text-xl font-bold text-[var(--text-primary)]">{siteName}</span>
          </div>
        </div>

        <Card variant="glass" padding="lg" glow>
          <CardContent>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {requires2FA ? t('login.2faTitle') : t('login.title')}
              </h1>
              <p className="text-[var(--text-secondary)]">
                {requires2FA
                  ? t('login.2faSubtitle')
                  : t('login.subtitle')}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!requires2FA ? (
                <>
                  <Input
                    label={t('login.email')}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail className="w-4 h-4" />}
                    placeholder={t('login.emailPlaceholder')}
                    required
                  />

                  <Input
                    label={t('login.password')}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    }
                    placeholder={t('login.passwordPlaceholder')}
                    required
                  />
                </>
              ) : (
                <Input
                  label={t('login.2faCode')}
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  leftIcon={<Shield className="w-4 h-4" />}
                  placeholder={t('login.2faPlaceholder')}
                  maxLength={6}
                  required
                />
              )}

              {!requires2FA && (
                <div className="flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-[var(--accent-primary)] hover:underline"
                  >
                    {t('login.forgotPassword')}
                  </Link>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                glow
                isLoading={isLoading}
                className="w-full"
              >
                {requires2FA ? t('login.verify') : t('login.signIn')}
              </Button>

              {requires2FA && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setRequires2FA(false);
                    setTotpCode('');
                  }}
                >
                  {t('login.backToLogin')}
                </Button>
              )}
            </form>

            {/* OAuth Providers */}
            {!requires2FA && oauthProviders.length > 0 && (
              <div className="mt-6">
                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[var(--border-color)]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-[var(--bg-card)] text-[var(--text-muted)]">{t('login.orContinueWith')}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {oauthProviders.includes('linuxdo') && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      isLoading={oauthLoading}
                      onClick={handleLinuxDoLogin}
                      leftIcon={<ExternalLink className="w-4 h-4" />}
                    >
                      {t('login.signInWith', { provider: 'LinuxDo' })}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {!requires2FA && (
              <div className="mt-6 text-center">
                <p className="text-[var(--text-secondary)] text-sm">
                  {t('login.noAccount')}{' '}
                  <Link
                    to="/register"
                    className="text-[var(--accent-primary)] hover:underline font-medium"
                  >
                    {t('login.signUp')}
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
