import React, { useState, useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Menu, X, Sun, Moon, Shield, User, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui';

export const PublicLayout: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => setIsDark(!isDark);

  const navItems = [
    { label: 'Products', href: '#products' },
    { label: 'Solutions', href: '#solutions' },
    { label: 'Developers', href: '#developers' },
    { label: 'Pricing', href: '#pricing' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white">
      <nav
        className={`
          fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b
          ${scrolled
            ? 'border-white/5 bg-[#0A0A0C]/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.1)]'
            : 'border-transparent bg-transparent py-2'}
        `}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#00F0FF] to-[#7000FF] rounded-lg blur-[2px] opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-full h-full bg-[#0A0A0C] rounded-lg border border-white/10 flex items-center justify-center overflow-hidden">
                <div className="w-3 h-3 bg-gradient-to-tr from-[#00F0FF] to-white rounded-sm rotate-45 group-hover:rotate-90 transition-transform duration-500" />
              </div>
            </div>
            <span className="text-lg font-bold tracking-tight text-white group-hover:text-[#00F0FF] transition-colors">NEXUS</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="hover:text-white transition-colors relative group overflow-hidden"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-full h-px bg-[#00F0FF] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-400 hover:bg-white/5 hover:text-white transition-all"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="h-4 w-px bg-white/10 mx-2" />

            {isAuthenticated ? (
              <div className="flex items-center gap-4 animate-fade-in">
                {user?.role === 'admin' && (
                  <Link
                    to="/admin/dashboard"
                    className="px-3 py-1.5 rounded-full text-red-400 bg-red-500/5 hover:bg-red-500/10 transition-all flex items-center gap-1.5 text-xs font-mono border border-red-500/10 hover:border-red-500/30"
                  >
                    <Shield className="w-3 h-3" /> ADMIN
                  </Link>
                )}

                <div className="flex items-center gap-3">
                  <div className="text-right hidden lg:block leading-tight">
                    <div className="text-xs text-white font-medium">{user?.role === 'admin' ? 'System Op' : 'Developer'}</div>
                    <div className="text-[10px] text-gray-500 font-mono tracking-wide">ONLINE</div>
                  </div>
                  <Link to="/app/dashboard" className="relative group">
                    <div className="absolute inset-0 bg-[#00F0FF]/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00F0FF] to-[#7000FF] p-[1px] relative z-10">
                      <div className="w-full h-full rounded-full bg-[#0A0A0C] flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={logout}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                    title="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-3 py-2"
                >
                  Log In
                </Link>
                <Button
                  variant="primary"
                  className="h-9 px-4 text-xs bg-white text-black hover:bg-gray-200 border-none font-bold tracking-wide"
                  onClick={() => {}}
                >
                  <Link to="/register">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden z-50 relative flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-400 hover:text-white p-2"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu Overlay */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 bg-[#0A0A0C]/98 backdrop-blur-3xl z-40 flex flex-col items-center justify-center space-y-8 animate-[fadeIn_0.2s_ease-out]">
              {navItems.map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-3xl font-light text-gray-300 hover:text-white tracking-tight"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}

              <div className="w-16 h-px bg-white/10 my-8" />

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
                    <Link to="/app/dashboard" className="w-full">Go to Console</Link>
                  </Button>
                  <button
                    onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                    className="text-gray-500 hover:text-white flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Log Out
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
                    <Link to="/register" className="w-full">Start Building</Link>
                  </Button>
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-lg text-gray-400 hover:text-white mt-4"
                  >
                    Log In
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
