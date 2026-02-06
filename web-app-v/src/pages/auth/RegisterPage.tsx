import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Gift, Ticket } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button, Input, Card, CardContent } from '../../components/ui';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();

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
      setValidationError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setValidationError('Password must be at least 8 characters');
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
              <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
              <p className="text-gray-400">
                Sign up to get started with NEXUS
              </p>
            </div>

            {(error || validationError) && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error || validationError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                leftIcon={<User className="w-4 h-4" />}
                placeholder="Choose a username"
                required
              />

              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                leftIcon={<Mail className="w-4 h-4" />}
                placeholder="Enter your email"
                required
              />

              <Input
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
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
                placeholder="Create a password"
                required
              />

              <Input
                label="Confirm Password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-gray-500 hover:text-gray-300"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
                placeholder="Confirm your password"
                required
              />

              <div className="pt-2 border-t border-[#2A2A30]">
                <Input
                  label="Invite Code (Optional)"
                  name="inviteCode"
                  type="text"
                  value={formData.inviteCode}
                  onChange={handleChange}
                  leftIcon={<Ticket className="w-4 h-4" />}
                  placeholder="Enter invite code"
                />
              </div>

              <Input
                label="Promo Code (Optional)"
                name="promoCode"
                type="text"
                value={formData.promoCode}
                onChange={handleChange}
                leftIcon={<Gift className="w-4 h-4" />}
                placeholder="Enter promo code"
              />

              <Button
                type="submit"
                variant="primary"
                glow
                isLoading={isLoading}
                className="w-full mt-6"
              >
                Create Account
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-[#00F0FF] hover:underline font-medium"
                >
                  Sign in
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
