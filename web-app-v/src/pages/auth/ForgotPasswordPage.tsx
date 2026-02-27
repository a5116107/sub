import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/auth';
import { useSettingsStore } from '../../stores/settingsStore';
import { Button, Input, Card, CardContent } from '../../components/ui';

export const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation('auth');
  const siteName = useSettingsStore((s) => s.settings?.site_name) || 'NEXUS';
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authApi.forgotPassword({ email });
      setIsSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('forgot.error'));
    } finally {
      setIsLoading(false);
    }
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
            {!isSent ? (
              <>
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                    {t('forgot.title')}
                  </h1>
                  <p className="text-[var(--text-secondary)]">
                    {t('forgot.subtitle')}
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label={t('forgot.email')}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail className="w-4 h-4" />}
                    placeholder={t('forgot.emailPlaceholder')}
                    required
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    glow
                    isLoading={isLoading}
                    className="w-full"
                  >
                    {t('forgot.sendLink')}
                  </Button>
                </form>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                  {t('forgot.checkEmail')}
                </h2>
                <p className="text-[var(--text-secondary)] mb-6">
                  {t('forgot.emailSent')}{' '}
                  <span className="text-[var(--text-primary)]">{email}</span>
                </p>
                <Link
                  to="/login"
                  className="text-[var(--accent-primary)] hover:underline text-sm"
                >
                  {t('forgot.backToLogin')}
                </Link>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-[var(--border-color)]">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('forgot.backToLogin')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
