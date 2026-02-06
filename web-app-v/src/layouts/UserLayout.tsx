import React, { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Key,
  BarChart3,
  CreditCard,
  Gift,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Announcements } from '../components/Announcements';

const navItems = [
  { path: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/app/api-keys', label: 'API Keys', icon: Key },
  { path: '/app/usage', label: 'Usage', icon: BarChart3 },
  { path: '/app/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { path: '/app/redeem', label: 'Redeem', icon: Gift },
];

const settingsItems = [
  { path: '/app/settings/profile', label: 'Profile', icon: User },
  { path: '/app/settings/security', label: 'Security', icon: Shield },
  { path: '/app/settings/2fa', label: '2FA', icon: ShieldCheck },
];

export const UserLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
    <div className="min-h-screen bg-[#0A0A0C] text-white flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-[#2A2A30] bg-[#0A0A0C] fixed h-full">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-[#2A2A30]">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#00F0FF] to-[#7000FF] rounded-lg blur-[2px] opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-full h-full bg-[#0A0A0C] rounded-lg border border-white/10 flex items-center justify-center overflow-hidden">
                <div className="w-3 h-3 bg-gradient-to-tr from-[#00F0FF] to-white rounded-sm rotate-45" />
              </div>
            </div>
            <span className="text-lg font-bold text-white">NEXUS</span>
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
                    ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'}
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
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
            >
              <span>Settings</span>
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
                        ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'}
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
        <div className="p-4 border-t border-[#2A2A30]">
          {isAdmin && (
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg text-xs font-mono text-red-400 bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-colors"
            >
              <Shield className="w-3 h-3" />
              ADMIN PANEL
            </Link>
          )}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00F0FF] to-[#7000FF] p-[1px]">
              <div className="w-full h-full rounded-full bg-[#0A0A0C] flex items-center justify-center">
                <User className="w-4 h-4 text-gray-300" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.username || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0A0A0C]/95 backdrop-blur-xl border-b border-[#2A2A30]">
        <div className="flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#00F0FF] to-[#7000FF] rounded-lg blur-[2px] opacity-70" />
              <div className="relative w-full h-full bg-[#0A0A0C] rounded-lg border border-white/10 flex items-center justify-center overflow-hidden">
                <div className="w-3 h-3 bg-gradient-to-tr from-[#00F0FF] to-white rounded-sm rotate-45" />
              </div>
            </div>
            <span className="text-lg font-bold text-white">NEXUS</span>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-400 hover:text-white"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="border-t border-[#2A2A30] bg-[#0A0A0C] max-h-[calc(100vh-4rem)] overflow-y-auto">
            <nav className="p-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all
                    ${isActive(item.path)
                      ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'}
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-[#2A2A30] mt-4">
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Settings
                </p>
                {settingsItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all
                      ${isActive(item.path)
                        ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'}
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
                  className="flex items-center gap-2 px-3 py-3 mt-4 rounded-lg text-sm font-mono text-red-400 bg-red-500/5 border border-red-500/10"
                >
                  <Shield className="w-4 h-4" />
                  ADMIN PANEL
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-3 w-full rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-white/5 transition-all mt-4"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
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
