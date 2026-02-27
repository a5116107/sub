import React, { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Key,
  BarChart3,
  CreditCard,
  Gift,
  FileText,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useSettingsStore } from '../stores/settingsStore';
import { Announcements } from '../components/Announcements';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const UserLayout: React.FC = () => {
  const { t } = useTranslation('common');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const siteName = useSettingsStore((s) => s.settings?.site_name) || 'NEXUS';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const navItems = [
    { path: '/app/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { path: '/app/api-keys', label: t('nav.apiKeys'), icon: Key },
    { path: '/app/usage', label: t('nav.usage'), icon: BarChart3 },
    { path: '/app/subscriptions', label: t('nav.subscriptions'), icon: CreditCard },
    { path: '/app/redeem', label: t('nav.redeem'), icon: Gift },
    { path: '/app/docs', label: t('nav.docs'), icon: FileText },
  ];

  const settingsItems = [
    { path: '/app/settings/profile', label: t('nav.profile'), icon: User },
    { path: '/app/settings/security', label: t('nav.security'), icon: Shield },
    { path: '/app/settings/2fa', label: t('nav.2fa'), icon: ShieldCheck },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/app/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-[var(--border-color)] bg-[var(--bg-card)] fixed h-full">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-[var(--border-color)]">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#00F0FF] to-[#7000FF] rounded-lg blur-[2px] opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-full h-full bg-[var(--bg-card)] rounded-lg border border-[var(--border-color-subtle)] flex items-center justify-center overflow-hidden">
                <div className="w-3 h-3 bg-gradient-to-tr from-[#00F0FF] to-white rounded-sm rotate-45" />
              </div>
            </div>
            <span className="text-lg font-bold text-[var(--text-primary)]">{siteName}</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${isActive(item.path)
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] border border-[var(--accent-soft)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]/55'}
                `}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </div>

          {/* Settings Section */}
          <div className="mt-8">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider"
            >
              <span>{t('nav.settings')}</span>
              <ChevronRight
                className={`w-4 h-4 transition-transform ${isSettingsOpen ? 'rotate-90' : ''}`}
              />
            </button>
            {isSettingsOpen && (
              <div className="mt-1 space-y-1">
                {settingsItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                      ${isActive(item.path)
                        ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] border border-[var(--accent-soft)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]/55'}
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-[var(--border-color)]">
          {isAdmin && (
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg text-xs font-mono text-red-600 dark:text-red-400 bg-red-500/8 border border-red-500/15 hover:bg-red-500/14 transition-colors"
            >
              <Shield className="w-3 h-3" />
              {t('nav.adminPanel')}
            </Link>
          )}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00F0FF] to-[#7000FF] p-[1px]">
              <div className="w-full h-full rounded-full bg-[var(--bg-card)] flex items-center justify-center">
                <User className="w-4 h-4 text-[var(--text-secondary)]" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user?.username || 'User'}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
            </div>
            <LanguageSwitcher />
            <button
              onClick={handleLogout}
              className="p-2 text-[var(--text-muted)] hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title={t('nav.logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--bg-card)]/95 backdrop-blur-xl border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#00F0FF] to-[#7000FF] rounded-lg blur-[2px] opacity-70" />
              <div className="relative w-full h-full bg-[var(--bg-card)] rounded-lg border border-[var(--border-color-subtle)] flex items-center justify-center overflow-hidden">
                <div className="w-3 h-3 bg-gradient-to-tr from-[#00F0FF] to-white rounded-sm rotate-45" />
              </div>
            </div>
            <span className="text-lg font-bold text-[var(--text-primary)]">{siteName}</span>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="border-t border-[var(--border-color)] bg-[var(--bg-card)] max-h-[calc(100vh-4rem)] overflow-y-auto">
            <nav className="p-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all
                    ${isActive(item.path)
                      ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] border border-[var(--accent-soft)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]/55'}
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-[var(--border-color)] mt-4">
                <p className="px-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  {t('nav.settings')}
                </p>
                {settingsItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all
                      ${isActive(item.path)
                        ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] border border-[var(--accent-soft)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]/55'}
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                ))}
              </div>
              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-3 mt-4 rounded-lg text-sm font-mono text-red-600 dark:text-red-400 bg-red-500/8 border border-red-500/15"
                >
                  <Shield className="w-4 h-4" />
                  {t('nav.adminPanel')}
                </Link>
              )}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-color)]">
                <LanguageSwitcher />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-red-600 dark:hover:text-red-400 hover:bg-[var(--accent-soft)]/55 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  {t('nav.logout')}
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <Outlet />
      </main>

      {/* Announcements */}
      <Announcements />
    </div>
  );
};

export default UserLayout;
