import React, { useState, useEffect } from 'react';
import { User, Mail, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { userApi } from '../../../api/user';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Skeleton } from '../../../components/ui';

export const ProfilePage: React.FC = () => {
  const { user, setUser } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const updated = await userApi.updateProfile(formData);
      setUser(updated);
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton height={40} />
              <Skeleton height={40} />
              <Skeleton height={40} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Profile Settings</h1>
        <p className="text-gray-400">Manage your personal information</p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#00F0FF]" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="pl-10"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#2A2A30]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Member since {new Date(user.created_at).toLocaleDateString()}
                </div>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-white/5">
              <p className="text-sm text-gray-500 mb-1">User ID</p>
              <p className="text-white font-mono">{user.id}</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5">
              <p className="text-sm text-gray-500 mb-1">Role</p>
              <p className="text-white capitalize">{user.role}</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5">
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <p className="text-white capitalize">{user.status}</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5">
              <p className="text-sm text-gray-500 mb-1">Concurrency</p>
              <p className="text-white">{user.concurrency}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
