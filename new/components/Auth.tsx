import React, { useState } from 'react';
import { AppView, UserSession } from '../types';
import { Button } from './Button';
import { Mail, Lock, User, ArrowRight, Github, Chrome, ShieldCheck, AlertCircle, CheckSquare, Square } from 'lucide-react';

interface AuthProps {
  initialView: AppView; // LOGIN or REGISTER
  onLogin: (user: UserSession) => void;
  setView: (view: AppView) => void;
}

export const Auth: React.FC<AuthProps> = ({ initialView, onLogin, setView }) => {
  const [view, setAuthView] = useState<'LOGIN' | 'REGISTER'>(initialView === AppView.REGISTER ? 'REGISTER' : 'LOGIN');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSwitch = (newView: 'LOGIN' | 'REGISTER') => {
    setAuthView(newView);
    setError('');
    // Reset basic fields but keep non-sensitive ones if desired, here we reset all for security/clean state
    setFormData({ 
      username: '', 
      email: '', 
      password: '', 
      confirmPassword: '', 
      agreeTerms: false 
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate network delay for realism
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (view === 'LOGIN') {
      if (formData.username === 'admin' && formData.password === 'admin123') {
        onLogin({
          id: 'admin_01',
          username: 'System Admin',
          email: 'admin@nexus.ai',
          role: 'admin',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'
        });
      } else if (formData.username && formData.password) {
        // Mock successful user login
        onLogin({
           id: `usr_${Math.floor(Math.random() * 1000)}`,
           username: formData.username,
           email: formData.username + '@example.com', // Infer for demo
           role: 'user',
           avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.username}`
        });
      } else {
        setError('Invalid credentials. Try "admin" / "admin123" for demo.');
        setIsLoading(false);
      }
    } else {
      // REGISTER
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }
      
      if (!formData.agreeTerms) {
        setError('You must agree to the Terms of Service.');
        setIsLoading(false);
        return;
      }
      
      // Check for admin registration attempt with reserved name
      if (formData.username.toLowerCase() === 'admin') {
         setError('Username "admin" is reserved. Please log in.');
         setIsLoading(false);
         return;
      }

      if (formData.username && formData.email && formData.password) {
         // Mock success registration -> auto login as user
         onLogin({
           id: `usr_${Math.floor(Math.random() * 1000)}`,
           username: formData.username,
           email: formData.email,
           role: 'user',
           avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.username}`
         });
      } else {
         setError('Please fill in all fields.');
         setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-20 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.4)] relative group">
             <div className="absolute inset-0 bg-white/20 blur-lg rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
             <div className="w-4 h-4 bg-white rounded-full relative z-10" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            {view === 'LOGIN' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-gray-400">
            {view === 'LOGIN' 
              ? 'Enter your credentials to access the Nexus.' 
              : 'Join the infrastructure for the future.'}
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel p-8 rounded-2xl border border-nexus-border bg-[#0A0A0C]/60 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          
          {/* Subtle top light border */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-50" />

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm animate-[shimmer_0.5s_ease-in-out]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Username</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                <input 
                  type="text" 
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Username" 
                  className="w-full bg-[#0E0E11] border border-nexus-border rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 outline-none focus:border-cyan-500/50 focus:bg-white/5 transition-all"
                />
              </div>
            </div>

            {view === 'REGISTER' && (
              <div className="space-y-1 animate-fade-in">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@company.com" 
                    className="w-full bg-[#0E0E11] border border-nexus-border rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 outline-none focus:border-cyan-500/50 focus:bg-white/5 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••" 
                  className="w-full bg-[#0E0E11] border border-nexus-border rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 outline-none focus:border-cyan-500/50 focus:bg-white/5 transition-all"
                />
              </div>
            </div>

            {view === 'REGISTER' && (
              <div className="space-y-1 animate-fade-in">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Confirm Password</label>
                <div className="relative group">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                  <input 
                    type="password" 
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••" 
                    className="w-full bg-[#0E0E11] border border-nexus-border rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 outline-none focus:border-cyan-500/50 focus:bg-white/5 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Extra Options */}
            <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
              {view === 'LOGIN' ? (
                <>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                     <input type="checkbox" className="rounded border-gray-600 bg-[#0E0E11] text-cyan-500 focus:ring-0 focus:ring-offset-0" />
                     Remember me
                  </label>
                  <a href="#" className="hover:text-cyan-400 transition-colors">Forgot Password?</a>
                </>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                   <input 
                     type="checkbox" 
                     name="agreeTerms"
                     checked={formData.agreeTerms}
                     onChange={handleChange}
                     className="rounded border-gray-600 bg-[#0E0E11] text-cyan-500 focus:ring-0 focus:ring-offset-0" 
                   />
                   I agree to the <span className="underline">Terms</span> & <span className="underline">Privacy</span>
                </label>
              )}
            </div>

            <div className="pt-2">
              <Button 
                type="submit" 
                variant="primary" 
                glow 
                isLoading={isLoading}
                className="w-full h-12 text-sm uppercase tracking-wide font-bold"
              >
                {view === 'LOGIN' ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
             <div className="h-px bg-white/5 flex-1" />
             <span className="text-xs text-gray-500 font-mono">OR CONTINUE WITH</span>
             <div className="h-px bg-white/5 flex-1" />
          </div>

          {/* Social Auth */}
          <div className="grid grid-cols-2 gap-4">
             <button className="flex items-center justify-center gap-2 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all text-sm font-medium text-gray-300">
                <Github className="w-4 h-4" /> GitHub
             </button>
             <button className="flex items-center justify-center gap-2 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all text-sm font-medium text-gray-300">
                <Chrome className="w-4 h-4" /> Google
             </button>
          </div>

        </div>

        {/* Toggle View */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            {view === 'LOGIN' ? "Don't have an account yet?" : "Already have an account?"}{' '}
            <button 
              onClick={() => handleSwitch(view === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
              className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              {view === 'LOGIN' ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>

        {/* Back to Home */}
        <div className="absolute -bottom-16 left-0 right-0 text-center">
           <button onClick={() => setView(AppView.LANDING)} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              Return to Homepage
           </button>
        </div>
      </div>
    </div>
  );
};