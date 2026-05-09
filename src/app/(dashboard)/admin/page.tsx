'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate } from '@/lib/utils';
import {
  Users,
  HeartPulse,
  BarChart3,
  Search,
  Pencil,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import type { Profile, SupportResource, ResourceCategory } from '@/types';

type AdminTab = 'analytics' | 'users' | 'resources';

interface Analytics {
  totalUsers: number;
  totalResumes: number;
  totalAssessments: number;
  submittedAssessments: number;
}

export default function AdminPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<AdminTab>('analytics');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [resources, setResources] = useState<SupportResource[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [editingResource, setEditingResource] = useState<SupportResource | null>(null);
  const [resourceForm, setResourceForm] = useState<Partial<SupportResource>>({
    category: 'mental_health',
    title: '',
    description: '',
    provider_name: '',
    external_url: '',
    booking_url: '',
    is_active: true,
  });
  const [savingResource, setSavingResource] = useState(false);

  const loadAll = useCallback(async () => {
    const [usersRes, resumesRes, assessmentsRes, resourcesRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('resumes').select('id'),
      supabase.from('assessments').select('id, status'),
      supabase.from('support_resources').select('*').order('created_at', { ascending: false }),
    ]);

    setUsers(usersRes.data ?? []);
    setResources(resourcesRes.data ?? []);
    setAnalytics({
      totalUsers: usersRes.data?.length ?? 0,
      totalResumes: resumesRes.data?.length ?? 0,
      totalAssessments: assessmentsRes.data?.length ?? 0,
      submittedAssessments: assessmentsRes.data?.filter((a) => a.status === 'submitted').length ?? 0,
    });
  }, [supabase]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleRoleChange(user: Profile, newRole: 'user' | 'admin') {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      setMessage({ type: 'error', text: 'Failed to update role.' });
    } else {
      setMessage({ type: 'success', text: `${user.full_name ?? 'User'} is now ${newRole}.` });
      await loadAll();
    }
  }

  async function handleToggleResource(resource: SupportResource) {
    await supabase.from('support_resources').update({ is_active: !resource.is_active }).eq('id', resource.id);
    await loadAll();
  }

  async function handleDeleteResource(resource: SupportResource) {
    if (!confirm(`Delete "${resource.title}"?`)) return;
    await supabase.from('support_resources').delete().eq('id', resource.id);
    setMessage({ type: 'success', text: 'Resource deleted.' });
    await loadAll();
  }

  function startEditResource(resource: SupportResource) {
    setEditingResource(resource);
    setResourceForm(resource);
    setShowResourceForm(true);
  }

  function resetResourceForm() {
    setEditingResource(null);
    setResourceForm({ category: 'mental_health', title: '', description: '', provider_name: '', external_url: '', booking_url: '', is_active: true });
    setShowResourceForm(false);
  }

  async function handleSaveResource(e: React.FormEvent) {
    e.preventDefault();
    if (!resourceForm.title?.trim()) {
      setMessage({ type: 'error', text: 'Title is required.' });
      return;
    }

    setSavingResource(true);
    setMessage(null);

    const payload = {
      category: resourceForm.category as ResourceCategory,
      title: resourceForm.title.trim(),
      description: resourceForm.description?.trim() || null,
      provider_name: resourceForm.provider_name?.trim() || null,
      external_url: resourceForm.external_url?.trim() || null,
      booking_url: resourceForm.booking_url?.trim() || null,
      is_active: resourceForm.is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    if (editingResource) {
      await supabase.from('support_resources').update(payload).eq('id', editingResource.id);
    } else {
      await supabase.from('support_resources').insert(payload);
    }

    setMessage({ type: 'success', text: editingResource ? 'Resource updated.' : 'Resource added.' });
    resetResourceForm();
    await loadAll();
    setSavingResource(false);
  }

  const filteredUsers = users.filter(
    (u) =>
      !userSearch ||
      u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'users', label: 'Manage Users', icon: Users },
    { id: 'resources', label: 'Resources', icon: HeartPulse },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
        <p className="text-slate-500 mt-1">Manage users, resources, and view analytics</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
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
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Analytics */}
      {tab === 'analytics' && analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: analytics.totalUsers, color: 'bg-sky-50 text-sky-700' },
            { label: 'Resumes Uploaded', value: analytics.totalResumes, color: 'bg-green-50 text-green-700' },
            { label: 'Assessments Started', value: analytics.totalAssessments, color: 'bg-purple-50 text-purple-700' },
            { label: 'Assessments Completed', value: analytics.submittedAssessments, color: 'bg-orange-50 text-orange-700' },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="pt-6 pb-5">
                <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
                <p className={`text-4xl font-bold ${color} rounded-xl px-2 py-1 inline-block`}>{value}</p>
              </CardContent>
            </Card>
          ))}

          {analytics.totalUsers > 0 && (
            <Card className="col-span-2 lg:col-span-4">
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Completion Rates</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Resume upload rate', value: Math.round((analytics.totalResumes / analytics.totalUsers) * 100) },
                    { label: 'Assessment completion rate', value: Math.round((analytics.submittedAssessments / Math.max(analytics.totalAssessments, 1)) * 100) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-600">{label}</span>
                        <span className="font-semibold text-slate-900">{value}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-500 rounded-full transition-all"
                          style={{ width: `${Math.min(value, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">Users ({users.length})</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users..."
                  className="pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent w-60"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-slate-100">
                    {['User', 'Email', 'Role', 'Joined', 'Actions'].map((h) => (
                      <th key={h} className="pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wide pr-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="group">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={user.avatar_url} name={user.full_name} size="sm" />
                          <span className="text-sm font-medium text-slate-900 whitespace-nowrap">
                            {user.full_name ?? 'No name'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm text-slate-500 whitespace-nowrap">{user.email}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={user.role === 'admin' ? 'warning' : 'info'}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-sm text-slate-400 whitespace-nowrap">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRoleChange(user, user.role === 'admin' ? 'user' : 'admin')}
                        >
                          {user.role === 'admin' ? 'Revoke admin' : 'Make admin'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">No users found.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resources */}
      {tab === 'resources' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Support Resources ({resources.length})</h2>
            <Button
              size="sm"
              onClick={() => { resetResourceForm(); setShowResourceForm(true); }}
            >
              <Plus className="w-4 h-4" />
              Add Resource
            </Button>
          </div>

          {/* Resource Form */}
          {showResourceForm && (
            <Card className="border-sky-200">
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">
                  {editingResource ? 'Edit Resource' : 'New Resource'}
                </h3>
                <form onSubmit={handleSaveResource} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
                    <input
                      type="text"
                      value={resourceForm.title ?? ''}
                      onChange={(e) => setResourceForm((f) => ({ ...f, title: e.target.value }))}
                      required
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Category *</label>
                    <select
                      value={resourceForm.category ?? 'mental_health'}
                      onChange={(e) => setResourceForm((f) => ({ ...f, category: e.target.value as ResourceCategory }))}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="mental_health">Mental Health</option>
                      <option value="physical_health">Physical Health</option>
                      <option value="late_diagnosis">Late Diagnosis</option>
                      <option value="social_groups">Social Groups</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Provider Name</label>
                    <input
                      type="text"
                      value={resourceForm.provider_name ?? ''}
                      onChange={(e) => setResourceForm((f) => ({ ...f, provider_name: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">External URL</label>
                    <input
                      type="url"
                      value={resourceForm.external_url ?? ''}
                      onChange={(e) => setResourceForm((f) => ({ ...f, external_url: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder="https://"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Booking URL</label>
                    <input
                      type="url"
                      value={resourceForm.booking_url ?? ''}
                      onChange={(e) => setResourceForm((f) => ({ ...f, booking_url: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder="https://"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                    <textarea
                      value={resourceForm.description ?? ''}
                      onChange={(e) => setResourceForm((f) => ({ ...f, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                    />
                  </div>
                  <div className="sm:col-span-2 flex gap-3">
                    <Button type="submit" loading={savingResource}>
                      {editingResource ? 'Save changes' : 'Add resource'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={resetResourceForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Resources Table */}
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-slate-100">
                      {['Title', 'Category', 'Provider', 'Status', 'Actions'].map((h) => (
                        <th key={h} className="pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wide pr-4">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {resources.map((resource) => (
                      <tr key={resource.id}>
                        <td className="py-3 pr-4">
                          <p className="text-sm font-medium text-slate-900">{resource.title}</p>
                          {resource.description && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{resource.description}</p>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="default">
                            {resource.category.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-sm text-slate-500">{resource.provider_name ?? '—'}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={resource.is_active ? 'success' : 'default'}>
                            {resource.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleToggleResource(resource)} title={resource.is_active ? 'Deactivate' : 'Activate'}>
                              {resource.is_active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => startEditResource(resource)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteResource(resource)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {resources.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">No resources yet. Add one above.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
