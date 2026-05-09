'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { Camera, Clock, Loader2 } from 'lucide-react';
import type { Profile, Assessment } from '@/types';

export default function ProfilePage() {
  const supabase = createClient();
  const toast = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState({ full_name: '', company_name: '' });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, assessRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('assessments').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        setForm({
          full_name: profileRes.data.full_name ?? '',
          company_name: profileRes.data.company_name ?? '',
        });
      }
      setAssessments(assessRes.data ?? []);
    }
    load();
  }, [supabase]);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name.trim() || null,
        company_name: form.company_name.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (error) {
      toast('error', 'Save failed', error.message);
    } else {
      setProfile((prev) =>
        prev
          ? { ...prev, full_name: form.full_name.trim() || null, company_name: form.company_name.trim() || null }
          : prev
      );
      toast('success', 'Profile saved!', 'Your information has been updated.');
      setEditing(false);
    }
    setSaving(false);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !profile) return;

    if (!file.type.startsWith('image/')) {
      toast('error', 'Invalid file', 'Please upload a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('error', 'File too large', 'Image must be under 5MB.');
      return;
    }

    setUploadingAvatar(true);

    const ext = file.name.split('.').pop() ?? 'jpg';
    const filePath = `${profile.id}/avatar.${ext}`;

    const { error: storageError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true, cacheControl: '3600' });

    if (storageError) {
      toast('error', 'Upload failed', storageError.message);
      setUploadingAvatar(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

    // Append a cache-bust so Next.js Image re-fetches
    const urlWithBust = `${publicUrl}?t=${Date.now()}`;

    const { error: dbError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlWithBust, updated_at: new Date().toISOString() })
      .eq('id', profile.id);

    if (dbError) {
      toast('error', 'Save failed', dbError.message);
    } else {
      setProfile((prev) => prev ? { ...prev, avatar_url: urlWithBust } : prev);
      toast('success', 'Photo updated!', 'Your profile picture has been saved.');
    }

    setUploadingAvatar(false);
  }

  const efAssessment = assessments.find((a) => a.type === 'ef' && a.status === 'submitted');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-500 mt-1">Manage your personal information and view your results</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6 text-center">
              {/* Avatar with upload button */}
              <div className="relative inline-block mb-4">
                <Avatar src={profile?.avatar_url} name={profile?.full_name} size="xl" />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 flex items-center justify-center w-8 h-8 rounded-full bg-sky-500 border-2 border-white hover:bg-sky-600 transition-colors disabled:opacity-60 shadow"
                  aria-label="Change profile photo"
                >
                  {uploadingAvatar
                    ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                    : <Camera className="w-4 h-4 text-white" />
                  }
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              {editing ? (
                <div className="space-y-3 text-left">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Full name</label>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Company</label>
                    <input
                      type="text"
                      value={form.company_name}
                      onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      placeholder="Company name"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={handleSave} loading={saving} className="flex-1">
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditing(false);
                        setForm({ full_name: profile?.full_name ?? '', company_name: profile?.company_name ?? '' });
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-slate-900">{profile?.full_name ?? 'No name set'}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{profile?.email}</p>
                  {profile?.company_name && (
                    <p className="text-sm text-slate-600 mt-1">{profile.company_name}</p>
                  )}
                  <Badge variant={profile?.role === 'admin' ? 'warning' : 'info'} className="mt-2">
                    {profile?.role === 'admin' ? 'Admin' : 'User'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                    className="mt-4 w-full"
                  >
                    Edit Profile
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Assessment Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* EF Score */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4">EF Assessment Score</h3>
              {efAssessment ? (
                <div className="flex items-center gap-6">
                  <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-sky-50 border-4 border-sky-200">
                    <span className="text-2xl font-bold text-sky-700">
                      {efAssessment.ef_score ?? 'N/A'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Completed on</p>
                    <p className="text-sm font-medium text-slate-900">{formatDate(efAssessment.updated_at)}</p>
                    <Badge variant="success" className="mt-2">Submitted</Badge>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <p className="text-sm text-slate-500">No completed EF assessment yet.</p>
                  <a href="/assessments" className="ml-auto text-sm text-sky-600 hover:text-sky-700 font-medium">
                    Start now →
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assessment History */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Assessment History</h3>
              {assessments.length === 0 ? (
                <p className="text-sm text-slate-400">No assessments on record.</p>
              ) : (
                <div className="space-y-2">
                  {assessments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {a.type === 'ef' ? 'EF Assessment' : 'Me-manual'}
                        </p>
                        <p className="text-xs text-slate-400">{formatDate(a.updated_at)}</p>
                      </div>
                      <Badge variant={a.status === 'submitted' ? 'success' : 'warning'}>
                        {a.status === 'submitted' ? 'Completed' : 'Draft'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coming Soon */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Coming Soon</h3>
              <div className="grid grid-cols-2 gap-3">
                {['Skills Portfolio', 'Job Matches', 'Certificates', 'Endorsements'].map((item) => (
                  <div key={item} className="p-4 rounded-xl border border-dashed border-slate-200 flex items-center justify-between">
                    <span className="text-sm text-slate-400">{item}</span>
                    <Badge variant="outline">Soon</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
