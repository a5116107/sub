import React, { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Layers,
  Database,
  Gift,
  Ticket,
  Globe,
  BarChart3,
  Activity,
  Megaphone,
  Settings,
  FileText,
  Tag,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ArrowLeft,
  Tags,
  Server,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useSettingsStore } from '../stores/settingsStore';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const AdminLayout: React.FC = () => {
  const { t } = useTranslation('common');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const siteName = useSettingsStore((s) => s.settings?.site_name) || 'NEXUS';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navGroups = [
    {
      label: t('nav.overview'),
      items: [
        { path: '/admin/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
      ],
    },
    {
      label: t('nav.management'),
      items: [
        { path: '/admin/users', label: t('nav.users'), icon: Users },
        { path: '/admin/groups', label: t('nav.groups'), icon: Layers },
        { path: '/admin/accounts', label: t('nav.accounts'), icon: Database },
        { path: '/admin/subscriptions', label: t('nav.subscriptions'), icon: Tag },
      ],
    },
    {
      label: t('nav.codes'),
      items: [
        { path: '/admin/redeem-codes', label: t('nav.redeemCodes'), icon: Gift },
        { path: '/admin/promo-codes', label: t('nav.promoCodes'), icon: Ticket },
      ],
    },
    {
      label: t('nav.infrastructure'),
      items: [
        { path: '/admin/proxies', label: t('nav.proxies'), icon: Globe },
        { path: '/admin/usage', label: t('nav.usage'), icon: BarChart3 },
        { path: '/admin/ops', label: t('nav.ops'), icon: Activity },
      ],
    },
    {
      label: t('nav.system'),
      items: [
        { path: '/admin/announcements', label: t('nav.announcements'), icon: Megaphone },
        { path: '/admin/settings', label: t('nav.settings'), icon: Settings },
        { path: '/admin/model-pricing', label: t('nav.modelPricing'), icon: Tag },
        { path: '/admin/user-attributes', label: t('nav.userAttributes'), icon: Tags },
        { path: '/admin/docs', label: t('nav.docs'), icon: FileText },
        { path: '/admin/system', label: t('nav.system'), icon: Server },
      ],
    },
  ];

  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    navGroups.map(g => g.label)
  );

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev =>
      prev.includes(label)
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

  const isActive = (path: string) => {
    if (path === '/admin/dashboard') {
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
          <Link to="/admin/dashboard" className="flex items-center gap-2 group">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-red-500 to-orange-500 rounded-lg blur-[2px] opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-full h-full bg-[var(--bg-card)] rounded-lg border border-[var(--border-color-subtle)] flex items-center justify-center overflow-hidden">
                <div className="w-3 h-3 bg-gradient-to-tr from-red-400 to-white rounded-sm rotate-45" />
              </div>
            </div>
            <div>
              <span className="text-lg font-bold text-[var(--text-primary)]">{siteName}</span>
              <span className="ml-2 text-xs font-mono text-red-600 dark:text-red-400">{t('nav.admin')}</span>
            </div>
          </Link>
        </div>

        {/* Back to App */}
        <div className="px-4 py-2 border-b border-[var(--border-color)]">
          <Link
            to="/app/dashboard"
            className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            {t('nav.backToApp')}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--text-secondary)] transition-colors"
              >
                <span>{group.label}</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    expandedGroups.includes(group.label) ? '' : '-rotate-90'
                  }`}
                />
              </button>
              {expandedGroups.includes(group.label) && (
                <div className="mt-1 space-y-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
                        ${isActive(item.path)
                          ? 'bg-red-500/12 text-red-600 dark:text-red-400 border border-red-500/25'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]/55'}
                      `}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-red-500 to-orange-500 p-[1px]">
              <div className="w-full h-full rounded-full bg-[var(--bg-card)] flex items-center justify-center">
                <User className="w-4 h-4 text-[var(--text-secondary)]" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user?.username || 'Admin'}</p>
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
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-red-500 to-orange-500 rounded-lg blur-[2px] opacity-70" />
              <div className="relative w-full h-full bg-[var(--bg-card)] rounded-lg border border-[var(--border-color-subtle)] flex items-center justify-center overflow-hidden">
                <div className="w-3 h-3 bg-gradient-to-tr from-red-400 to-white rounded-sm rotate-45" />
              </div>
            </div>
            <div>
              <span className="text-lg font-bold text-[var(--text-primary)]">{siteName}</span>
              <span className="ml-2 text-xs font-mono text-red-600 dark:text-red-400">{t('nav.admin')}</span>
            </div>
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
            <div className="p-4 border-b border-[var(--border-color)]">
              <Link
                to="/app/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('nav.backToApp')}
              </Link>
            </div>
            <nav className="p-4">
              {navGroups.map((group) => (
                <div key={group.label} className="mb-4">
                  <p className="px-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`
                          flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all
                          ${isActive(item.path)
                            ? 'bg-red-500/12 text-red-600 dark:text-red-400 border border-red-500/25'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]/55'}
                        `}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-color)]">
                <LanguageSwitcher />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-red-600 dark:hover:text-red-400 hover:bg-[var(--accent-soft)]/55 transition-all"
                >
                  <LogOut className="w-4 h-4" />
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
    </div>
  );
};

export default AdminLayout;
