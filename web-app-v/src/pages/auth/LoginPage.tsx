import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button, Input, Card, CardContent } from '../../components/ui';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(email, password, requires2FA ? totpCode : undefined);
      navigate('/app/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('2FA')) {
        setRequires2FA(true);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00F0FF]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#7000FF]/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#00F0FF] to-[#7000FF] rounded-lg blur-[2px] opacity-70" />
              <div className="relative w-full h-full bg-[#0A0A0C] rounded-lg border border-white/10 flex items-center justify-center">
                <div className="w-3 h-3 bg-gradient-to-tr from-[#00F0FF] to-white rounded-sm rotate-45" />
              </div>
            </div>
            <span className="text-xl font-bold text-white">NEXUS</span>
          </div>
        </div>

        <Card variant="glass" padding="lg" glow>
          <CardContent>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">
                {requires2FA ? 'Two-Factor Authentication' : 'Welcome Back'}
              </h1>
              <p className="text-gray-400">
                {requires2FA
                  ? 'Enter your 2FA code to continue'
                  : 'Sign in to your account to continue'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!requires2FA ? (
                <>
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail className="w-4 h-4" />}
                    placeholder="Enter your email"
                    required
                  />

                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-500 hover:text-gray-300"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    }
                    placeholder="Enter your password"
                    required
                  />
                </>
              ) : (
                <Input
                  label="2FA Code"
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  leftIcon={<Shield className="w-4 h-4" />}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  required
                />
              )}

              {!requires2FA && (
                <div className="flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-[#00F0FF] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                glow
                isLoading={isLoading}
                className="w-full"
              >
                {requires2FA ? 'Verify' : 'Sign In'}
              </Button>

              {requires2FA && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setRequires2FA(false);
                    setTotpCode('');
                  }}
                >
                  Back to login
                </Button>
              )}
            </form>

            {!requires2FA && (
              <div className="mt-6 text-center">
                <p className="text-gray-400 text-sm">
                  Don't have an account?{' '}
                  <Link
                    to="/register"
                    className="text-[#00F0FF] hover:underline font-medium"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
