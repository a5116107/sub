import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';

const resolveRedirectTarget = (rawRedirect?: string | null) => {
  if (!rawRedirect || !rawRedirect.startsWith('/')) return '/app/dashboard';
  if (rawRedirect === '/dashboard') return '/app/dashboard';
  return rawRedirect;
};

export const OAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing OAuth callback...');

  useEffect(() => {
    const fragment = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const fragmentParams = new URLSearchParams(fragment);
    const token = fragmentParams.get('access_token');
    const redirect = fragmentParams.get('redirect');
    const error = fragmentParams.get('error');
    const errorMessage = fragmentParams.get('error_message') || fragmentParams.get('error_description');
    const deferSetError = (nextMessage: string) => {
      window.setTimeout(() => {
        setStatus('error');
        setMessage(nextMessage);
      }, 0);
    };

    if (error) {
      deferSetError(`OAuth error: ${errorMessage || error}`);
      return;
    }

    if (!token) {
      deferSetError('No access token received from OAuth callback');
      return;
    }

    const handleOAuthCallback = async () => {
      try {
        localStorage.setItem('access_token', token);

        useAuthStore.setState({
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        const user = await authApi.getMe();
        useAuthStore.setState({
          user,
          isAdmin: user.role === 'admin',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

        setStatus('success');
        setMessage('Authentication successful!');

        setTimeout(() => {
          navigate(resolveRedirectTarget(redirect));
        }, 1000);
      } catch (err) {
        localStorage.removeItem('access_token');
        useAuthStore.setState({
          token: null,
          user: null,
          isAuthenticated: false,
          isAdmin: false,
        });
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'OAuth authentication failed');
      }
    };

    handleOAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--accent-soft)] rounded-full blur-[120px]" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[120px]"
          style={{ background: 'color-mix(in oklab, var(--accent-secondary) 16%, transparent)' }}
        />
      </div>

      <div className="relative w-full max-w-md">
        <Card variant="glass" padding="lg" glow>
          <CardContent>
            <div className="text-center py-8">
              {status === 'loading' && (
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--accent-soft)] flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[var(--accent-primary)] animate-spin" />
                </div>
              )}

              {status === 'success' && (
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
                </div>
              )}

              {status === 'error' && (
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
                </div>
              )}

              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                {status === 'loading' && 'Processing...'}
                {status === 'success' && 'Success!'}
                {status === 'error' && 'Authentication Failed'}
              </h2>

              <p className="text-[var(--text-secondary)]">{message}</p>

              {status === 'error' && (
                <button
                  onClick={() => navigate('/login')}
                  className="mt-6 text-[var(--accent-primary)] hover:underline text-sm"
                >
                  Back to login
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
