import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui';

export const OAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing OAuth callback...');

  useEffect(() => {
    const code = searchParams.get('code');
    searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMessage(`OAuth error: ${error}`);
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('No authorization code received');
      return;
    }

    // Handle OAuth callback
    // This would typically call an API endpoint to exchange the code for a token
    const handleOAuthCallback = async () => {
      try {
        // TODO: Implement actual OAuth callback API call
        // const response = await authApi.handleOAuthCallback(code, state);
        // useAuthStore.getState().login(response.token, response.user);

        // For now, simulate success after a delay
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setStatus('success');
        setMessage('Authentication successful!');

        setTimeout(() => {
          navigate('/app/dashboard');
        }, 1000);
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'OAuth authentication failed');
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00F0FF]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#7000FF]/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        <Card variant="glass" padding="lg" glow>
          <CardContent>
            <div className="text-center py-8">
              {status === 'loading' && (
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#00F0FF]/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[#00F0FF] animate-spin" />
                </div>
              )}

              {status === 'success' && (
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
              )}

              {status === 'error' && (
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
              )}

              <h2 className="text-xl font-bold text-white mb-2">
                {status === 'loading' && 'Processing...'}
                {status === 'success' && 'Success!'}
                {status === 'error' && 'Authentication Failed'}
              </h2>

              <p className="text-gray-400">{message}</p>

              {status === 'error' && (
                <button
                  onClick={() => navigate('/login')}
                  className="mt-6 text-[#00F0FF] hover:underline text-sm"
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
