import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Auth } from './components/Auth';
import { AppView, UserSession } from './types';

function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING);
  const [isDark, setIsDark] = useState(true);
  
  // Auth State
  const [user, setUser] = useState<UserSession | null>(null);

  // Initialize theme
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const handleLogin = (userSession: UserSession) => {
    setUser(userSession);
    if (userSession.role === 'admin') {
      setCurrentView(AppView.ADMIN);
    } else {
      setCurrentView(AppView.DASHBOARD);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView(AppView.LANDING);
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return user ? <Dashboard user={user} /> : <Auth initialView={AppView.LOGIN} onLogin={handleLogin} setView={setCurrentView} />;
      case AppView.ADMIN:
        return (user && user.role === 'admin') ? <AdminDashboard user={user} /> : <Auth initialView={AppView.LOGIN} onLogin={handleLogin} setView={setCurrentView} />;
      case AppView.LOGIN:
      case AppView.REGISTER:
        return <Auth initialView={currentView} onLogin={handleLogin} setView={setCurrentView} />;
      case AppView.LANDING:
      default:
        return <LandingPage setView={setCurrentView} isAuthenticated={!!user} />;
    }
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-cyan-500/30 selection:text-cyan-100 transition-colors duration-300 ${isDark ? 'bg-[#0A0A0C] text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* 
        Condition: Only show main Navbar on Landing Page or if on Login/Register pages for easy exit.
        Dashboard & Admin have their own internal structures.
      */}
      {(currentView === AppView.LANDING || currentView === AppView.LOGIN || currentView === AppView.REGISTER) && (
        <Navbar 
          setView={setCurrentView} 
          currentView={currentView} 
          isDark={isDark}
          toggleTheme={toggleTheme}
          isAuthenticated={!!user}
          userRole={user?.role}
          onLogout={handleLogout}
        />
      )}

      {renderView()}
    </div>
  );
}

export default App;