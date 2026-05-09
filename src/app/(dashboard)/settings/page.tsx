'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, AlertCircle, Shield, Bell, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isOAuthUser, setIsOAuthUser] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? '');
      // Google OAuth users don't have a password
      const identities = user.identities ?? [];
      setIsOAuthUser(identities.some((i) => i.provider !== 'email'));
    }
    load();
  }, [supabase]);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setSaving(false);
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.'
    );
    if (!confirmed) return;

    const doubleConfirm = window.prompt('Type DELETE to confirm account deletion:');
    if (doubleConfirm !== 'DELETE') return;

    setMessage({ type: 'error', text: 'Please contact support to delete your account.' });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-2 p-4 rounded-xl text-sm border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      <div className="max-w-2xl space-y-6">
        {/* Account Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-slate-400" />
              <h2 className="text-base font-semibold text-slate-900">Account Information</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Email address</label>
                <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700">
                  {email}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {isOAuthUser
                    ? 'Email is managed by your Google account.'
                    : 'Email changes require verification.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password */}
        {!isOAuthUser ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-slate-400" />
                <h2 className="text-base font-semibold text-slate-900">Change Password</h2>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    New password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    placeholder="Min. 8 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirm new password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    placeholder="Repeat new password"
                  />
                </div>
                <Button type="submit" loading={saving}>
                  Update password
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-slate-400" />
                <h2 className="text-base font-semibold text-slate-900">Password</h2>
              </div>
              <p className="text-sm text-slate-500">
                Your account uses Google Sign-In. Password management is handled by Google.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Notifications placeholder */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-slate-400" />
              <h2 className="text-base font-semibold text-slate-900">Notifications</h2>
            </div>
            <p className="text-sm text-slate-400">Notification preferences coming soon.</p>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Trash2 className="w-5 h-5 text-red-400" />
              <h2 className="text-base font-semibold text-red-700">Danger Zone</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Deleting your account is permanent and cannot be undone. All your data including
              resumes and assessments will be permanently removed.
            </p>
            <Button variant="danger" size="sm" onClick={handleDeleteAccount}>
              <Trash2 className="w-4 h-4" />
              Delete account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
