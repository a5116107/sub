import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Gift, Ticket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useSettingsStore } from '../../stores/settingsStore';
import { Button, Input, Card, CardContent } from '../../components/ui';

export const RegisterPage: React.FC = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();
  const settings = useSettingsStore((s) => s.settings);
  const siteName = settings?.site_name || 'NEXUS';
  const registrationEnabled = settings?.registration_enabled ?? true;

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
    promoCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearError();
    setValidationError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError('');

    if (formData.password !== formData.confirmPassword) {
      setValidationError(t('register.passwordMismatch'));
      return;
    }

    if (formData.password.length < 8) {
      setValidationError(t('register.passwordTooShort'));
      return;
    }

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        invite_code: formData.inviteCode || undefined,
        promo_code: formData.promoCode || undefined,
      });
      navigate('/app/dashboard');
    } catch {
      // Error is handled by the store
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
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{t('register.title')}</h1>
              <p className="text-[var(--text-secondary)]">
                {t('register.subtitle', { siteName })}
              </p>
            </div>

            {(error || validationError) && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-sm">
                {error || validationError}
              </div>
            )}

            {!registrationEnabled ? (
              <div className="text-center py-4">
                <p className="text-[var(--text-secondary)] mb-2">{t('register.disabled')}</p>
                <p className="text-sm text-[var(--text-muted)]">{t('register.contactAdmin')}</p>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={t('register.username')}
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                leftIcon={<User className="w-4 h-4" />}
                placeholder={t('register.usernamePlaceholder')}
                required
              />

              <Input
                label={t('register.email')}
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                leftIcon={<Mail className="w-4 h-4" />}
                placeholder={t('register.emailPlaceholder')}
                required
              />

              <Input
                label={t('register.password')}
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
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
                placeholder={t('register.passwordPlaceholder')}
                required
              />

              <Input
                label={t('register.confirmPassword')}
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
                placeholder={t('register.confirmPasswordPlaceholder')}
                required
              />

              <div className="pt-2 border-t border-[var(--border-color)]">
                <Input
                  label={t('register.inviteCode')}
                  name="inviteCode"
                  type="text"
                  value={formData.inviteCode}
                  onChange={handleChange}
                  leftIcon={<Ticket className="w-4 h-4" />}
                  placeholder={t('register.inviteCodePlaceholder')}
                />
              </div>

              <Input
                label={t('register.promoCode')}
                name="promoCode"
                type="text"
                value={formData.promoCode}
                onChange={handleChange}
                leftIcon={<Gift className="w-4 h-4" />}
                placeholder={t('register.promoCodePlaceholder')}
              />

              <Button
                type="submit"
                variant="primary"
                glow
                isLoading={isLoading}
                className="w-full mt-6"
              >
                {t('register.createAccount')}
              </Button>
            </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-[var(--text-secondary)] text-sm">
                {t('register.hasAccount')}{' '}
                <Link
                  to="/login"
                  className="text-[var(--accent-primary)] hover:underline font-medium"
                >
                  {t('register.signIn')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
