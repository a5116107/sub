import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, Shield, User, LogOut, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useSettingsStore } from '../stores/settingsStore';
import { useThemeStore } from '../stores/themeStore';
import { useLandingStyleStore } from '../stores/landingStyleStore';
import { Button } from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const PublicLayout: React.FC = () => {
  const { t } = useTranslation('common');
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const siteName = useSettingsStore((s) => s.settings?.site_name) || 'NEXUS';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const styleMenuRef = useRef<HTMLDivElement | null>(null);
  const { theme, toggleTheme } = useThemeStore();
  const { lightStyle, setLightStyle } = useLandingStyleStore();
  const isDark = theme === 'dark';
  const isBusinessLight = lightStyle === 'business';
  const showLandingStyleSwitcher = location.pathname === '/' && !isDark;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isStyleMenuOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!styleMenuRef.current?.contains(event.target as Node)) {
        setIsStyleMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isStyleMenuOpen]);

  useEffect(() => {
    if (!isStyleMenuOpen) return;
    const timer = window.setTimeout(() => setIsStyleMenuOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [location.pathname, isDark, isStyleMenuOpen]);

  const navItems = [
    { label: t('nav.products'), href: '#products' },
    { label: t('nav.solutions'), href: '#solutions' },
    { label: t('nav.developers'), href: '#developers' },
    { label: t('nav.pricing'), href: '#pricing' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <nav
        className={`
          fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b
          ${scrolled
            ? 'border-[var(--border-color-subtle)] bg-[var(--bg-primary)]/86 backdrop-blur-xl shadow-[var(--shadow-md)]'
            : 'border-transparent bg-transparent py-2'}
        `}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#00F0FF] to-[#7000FF] rounded-lg blur-[2px] opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-full h-full bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color-subtle)] flex items-center justify-center overflow-hidden">
                <div className="w-3 h-3 bg-gradient-to-tr from-[#00F0FF] to-white rounded-sm rotate-45 group-hover:rotate-90 transition-transform duration-500" />
              </div>
            </div>
            <span className="text-lg font-bold tracking-tight text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">{siteName}</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--text-secondary)]">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="hover:text-[var(--text-primary)] transition-colors relative group overflow-hidden"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-full h-px bg-[var(--accent-primary)] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--border-color-subtle)] hover:text-[var(--text-primary)] transition-all"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {showLandingStyleSwitcher && (
              <div ref={styleMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsStyleMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={isStyleMenuOpen}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--bg-card-alpha)] border border-[var(--border-color-subtle)] shadow-[var(--shadow-sm)] hover:border-[var(--border-color)] transition-colors"
                  title="切换浅色风格"
                >
                  <span className="text-[10px] font-semibold text-[var(--text-muted)]">风格</span>
                  <span className="text-xs font-bold text-[var(--accent-primary)]">{isBusinessLight ? 'B' : 'A'}</span>
                  <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${isStyleMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isStyleMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+0.5rem)] w-40 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-[var(--shadow-lg)] z-50"
                  >
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={!isBusinessLight}
                      onClick={() => {
                        setLightStyle('tech');
                        setIsStyleMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors ${!isBusinessLight ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                      科技浅色 A
                    </button>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={isBusinessLight}
                      onClick={() => {
                        setLightStyle('business');
                        setIsStyleMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors ${isBusinessLight ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                      商务浅色 B
                    </button>
                  </div>
                )}
              </div>
            )}

            <LanguageSwitcher />

            <div className="h-4 w-px bg-[var(--border-color)] mx-2" />

            {isAuthenticated ? (
              <div className="flex items-center gap-4 animate-fade-in">
                {user?.role === 'admin' && (
                  <Link
                    to="/admin/dashboard"
                    className="px-3 py-1.5 rounded-full text-red-400 bg-red-500/5 hover:bg-red-500/10 transition-all flex items-center gap-1.5 text-xs font-mono border border-red-500/10 hover:border-red-500/30"
                  >
                    <Shield className="w-3 h-3" /> {t('nav.admin')}
                  </Link>
                )}

                <div className="flex items-center gap-3">
                  <div className="text-right hidden lg:block leading-tight">
                    <div className="text-xs text-[var(--text-primary)] font-medium">{user?.role === 'admin' ? t('role.admin') : t('role.developer')}</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono tracking-wide">{t('status.online')}</div>
                  </div>
                  <Link to="/app/dashboard" className="relative group">
                    <div className="absolute inset-0 bg-[var(--accent-primary)]/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[var(--accent-primary)] to-[var(--accent-secondary)] p-[1px] relative z-10">
                      <div className="w-full h-full rounded-full bg-[var(--bg-primary)] flex items-center justify-center">
                        <User className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" />
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={logout}
                    className="p-2 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                    title={t('nav.logOut')}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-2"
                >
                  {t('nav.logIn')}
                </Link>
                <Button
                  variant="primary"
                  className="h-9 px-4 text-xs border-none font-bold tracking-wide"
                  onClick={() => {}}
                >
                  <Link to="/register">{t('nav.signUp')}</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden z-50 relative flex items-center gap-2">
            {showLandingStyleSwitcher && (
              <button
                type="button"
                onClick={() => setLightStyle(isBusinessLight ? 'tech' : 'business')}
                className="px-2 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color-subtle)] transition-colors border border-[var(--border-color-subtle)]"
                title={isBusinessLight ? '切换到科技浅色 A' : '切换到商务浅色 B'}
              >
                {isBusinessLight ? 'B' : 'A'}
              </button>
            )}
            <LanguageSwitcher />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu Overlay */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 bg-[var(--bg-primary)]/98 backdrop-blur-3xl z-40 flex flex-col items-center justify-center space-y-8 animate-[fadeIn_0.2s_ease-out]">
              {navItems.map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-3xl font-light text-[var(--text-secondary)] hover:text-[var(--text-primary)] tracking-tight"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}

              <div className="w-16 h-px bg-[var(--border-color)] my-8" />

              {isAuthenticated ? (
                <div className="flex flex-col items-center gap-6 w-full px-8">
                  <Button
                    variant="primary"
                    glow
                    className="w-full h-14 text-lg"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <Link to="/app/dashboard" className="w-full">{t('nav.goToConsole')}</Link>
                  </Button>
                  <button
                    onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> {t('nav.logOut')}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 w-full px-8">
                  <Button
                    variant="primary"
                    glow
                    className="w-full h-14 text-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Link to="/register" className="w-full">{t('nav.startBuilding')}</Link>
                  </Button>
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] mt-4"
                  >
                    {t('nav.logIn')}
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
};

export default PublicLayout;
