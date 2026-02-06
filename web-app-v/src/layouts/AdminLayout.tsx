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
import { useAuth } from '../hooks/useAuth';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Management',
    items: [
      { path: '/admin/users', label: 'Users', icon: Users },
      { path: '/admin/groups', label: 'Groups', icon: Layers },
      { path: '/admin/accounts', label: 'Accounts', icon: Database },
      { path: '/admin/subscriptions', label: 'Subscriptions', icon: Tag },
    ],
  },
  {
    label: 'Codes',
    items: [
      { path: '/admin/redeem-codes', label: 'Redeem Codes', icon: Gift },
      { path: '/admin/promo-codes', label: 'Promo Codes', icon: Ticket },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { path: '/admin/proxies', label: 'Proxies', icon: Globe },
      { path: '/admin/usage', label: 'Usage', icon: BarChart3 },
      { path: '/admin/ops', label: 'Ops', icon: Activity },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/admin/announcements', label: 'Announcements', icon: Megaphone },
      { path: '/admin/settings', label: 'Settings', icon: Settings },
      { path: '/admin/model-pricing', label: 'Model Pricing', icon: Tag },
      { path: '/admin/user-attributes', label: 'User Attributes', icon: Tags },
      { path: '/admin/docs', label: 'Docs', icon: FileText },
      { path: '/admin/system', label: 'System', icon: Server },
    ],
  },
];

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    <div className="min-h-screen bg-[#0A0A0C] text-white flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-[#2A2A30] bg-[#0A0A0C] fixed h-full">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-[#2A2A30]">
          <Link to="/admin/dashboard" className="flex items-center gap-2 group">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-red-500 to-orange-500 rounded-lg blur-[2px] opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-full h-full bg-[#0A0A0C] rounded-lg border border-white/10 flex items-center justify-center overflow-hidden">
                <div className="w-3 h-3 bg-gradient-to-tr from-red-400 to-white rounded-sm rotate-45" />
              </div>
            </div>
            <div>
              <span className="text-lg font-bold text-white">NEXUS</span>
              <span className="ml-2 text-xs font-mono text-red-400">ADMIN</span>
            </div>
          </Link>
        </div>

        {/* Back to App */}
        <div className="px-4 py-2 border-b border-[#2A2A30]">
          <Link
            to="/app/dashboard"
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to App
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors"
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
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'}
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
        <div className="p-4 border-t border-[#2A2A30]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-red-500 to-orange-500 p-[1px]">
              <div className="w-full h-full rounded-full bg-[#0A0A0C] flex items-center justify-center">
                <User className="w-4 h-4 text-gray-300" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.username || 'Admin'}</p>
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
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-red-500 to-orange-500 rounded-lg blur-[2px] opacity-70" />
              <div className="relative w-full h-full bg-[#0A0A0C] rounded-lg border border-white/10 flex items-center justify-center overflow-hidden">
                <div className="w-3 h-3 bg-gradient-to-tr from-red-400 to-white rounded-sm rotate-45" />
              </div>
            </div>
            <div>
              <span className="text-lg font-bold text-white">NEXUS</span>
              <span className="ml-2 text-xs font-mono text-red-400">ADMIN</span>
            </div>
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
            <div className="p-4 border-b border-[#2A2A30]">
              <Link
                to="/app/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to App
              </Link>
            </div>
            <nav className="p-4">
              {navGroups.map((group) => (
                <div key={group.label} className="mb-4">
                  <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
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
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'}
                        `}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-3 w-full rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-white/5 transition-all mt-4 border-t border-[#2A2A30] pt-4"
              >
                <LogOut className="w-4 h-4" />
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
    </div>
  );
};

export default AdminLayout;
