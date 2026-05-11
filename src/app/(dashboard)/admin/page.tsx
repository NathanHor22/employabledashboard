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
  Download,
  ChevronDown,
  ChevronUp,
  GraduationCap,
} from 'lucide-react';
import type { Profile, Assessment, SupportResource, ResourceCategory } from '@/types';

type AdminTab = 'overview' | 'students' | 'users' | 'resources';

interface StudentRow {
  profile: Profile;
  efAssessment: Assessment | null;
  meAssessment: Assessment | null;
}

const EF_QUESTIONS = [
  { id: 'planning', label: 'Planning & Organization' },
  { id: 'working_memory', label: 'Working Memory' },
  { id: 'flexibility', label: 'Cognitive Flexibility' },
  { id: 'impulse_control', label: 'Impulse Control' },
  { id: 'emotional_regulation', label: 'Emotional Regulation' },
  { id: 'task_initiation', label: 'Task Initiation' },
];

const ME_FIELDS = [
  { key: 'communication_preferred_style', label: 'Preferred feedback style' },
  { key: 'communication_best_time', label: 'Most productive time' },
  { key: 'communication_challenges', label: 'Communication challenges' },
  { key: 'work_environment_ideal_env', label: 'Ideal work environment' },
  { key: 'work_environment_distractions', label: 'Distractions' },
  { key: 'work_environment_accommodations', label: 'Helpful accommodations' },
  { key: 'strengths_strengths', label: 'Key strengths' },
  { key: 'strengths_growth_areas', label: 'Growth areas' },
];

function exportToCSV(students: StudentRow[]) {
  const efHeaders = EF_QUESTIONS.map((q) => q.label);
  const headers = ['Name', 'Email', 'EF Score (/100)', ...efHeaders];

  const rows = students.map((s) => {
    const data = s.efAssessment?.data as Record<string, string> | undefined;
    return [
      `"${s.profile.full_name ?? ''}"`,
      `"${s.profile.email}"`,
      s.efAssessment?.ef_score ?? 'Not completed',
      ...EF_QUESTIONS.map((q) => data?.[q.id] ?? 'N/A'),
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [resources, setResources] = useState<SupportResource[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [editingResource, setEditingResource] = useState<SupportResource | null>(null);
  const [resourceForm, setResourceForm] = useState<Partial<SupportResource>>({
    category: 'mental_health', title: '', description: '',
    provider_name: '', external_url: '', booking_url: '', is_active: true,
  });
  const [savingResource, setSavingResource] = useState(false);

  const loadAll = useCallback(async () => {
    const [profilesRes, assessmentsRes, resourcesRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('assessments').select('*').order('created_at', { ascending: false }),
      supabase.from('support_resources').select('*').order('created_at', { ascending: false }),
    ]);
    setProfiles(profilesRes.data ?? []);
    setAssessments(assessmentsRes.data ?? []);
    setResources(resourcesRes.data ?? []);
  }, [supabase]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Realtime: auto-refresh when a new user registers
  useEffect(() => {
    const channel = supabase
      .channel('admin-profiles-watch')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
        loadAll();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, loadAll]);

  // Build student rows by joining profiles with their assessments
  const students: StudentRow[] = profiles.map((profile) => ({
    profile,
    efAssessment: assessments.find(
      (a) => a.user_id === profile.id && a.type === 'ef' && a.status === 'submitted'
    ) ?? null,
    meAssessment: assessments.find(
      (a) => a.user_id === profile.id && a.type === 'me_manual' && a.status === 'submitted'
    ) ?? null,
  }));

  const filteredStudents = students.filter(
    (s) =>
      !studentSearch ||
      s.profile.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.profile.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const totalUsers = profiles.length;
  const totalSubmitted = assessments.filter((a) => a.status === 'submitted').length;
  const totalResumes = 0; // placeholder — resumes table not loaded here to keep query light
  const completionRate = students.length > 0
    ? Math.round((students.filter((s) => s.efAssessment).length / students.length) * 100)
    : 0;

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

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

  const filteredUsers = profiles.filter(
    (u) =>
      !userSearch ||
      u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'students', label: 'Students', icon: GraduationCap },
    { id: 'users', label: 'Manage Users', icon: Users },
    { id: 'resources', label: 'Resources', icon: HeartPulse },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
        <p className="text-slate-500 mt-1">Monitor registrations, assessments, and manage the platform</p>
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
        <div className={`flex items-center gap-2 p-4 rounded-xl text-sm border ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Live registration counter */}
          <Card className="border-sky-100 bg-linear-to-br from-sky-50 to-white">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-slate-500">Total Students Registered</p>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Live
                    </span>
                  </div>
                  <p className="text-6xl font-bold text-sky-700 leading-none">{totalUsers}</p>
                  <p className="text-sm text-slate-400 mt-2">Updates automatically as new users register</p>
                </div>
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-100">
                  <Users className="w-8 h-8 text-sky-600" />
                </div>
              </div>

              {/* Simple visual bar */}
              {totalUsers > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                    <span>Student growth</span>
                    <span>{totalUsers} registered</span>
                  </div>
                  <div className="h-3 bg-sky-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min((totalUsers / Math.max(totalUsers + 10, 50)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'EF Assessments Submitted', value: assessments.filter(a => a.type === 'ef' && a.status === 'submitted').length, color: 'text-purple-700 bg-purple-50' },
              { label: 'Me-manuals Submitted', value: assessments.filter(a => a.type === 'me_manual' && a.status === 'submitted').length, color: 'text-orange-700 bg-orange-50' },
              { label: 'Assessment Completion Rate', value: `${completionRate}%`, color: 'text-green-700 bg-green-50' },
            ].map(({ label, value, color }) => (
              <Card key={label}>
                <CardContent className="pt-5 pb-5">
                  <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
                  <p className={`text-3xl font-bold rounded-xl px-2 py-1 inline-block ${color}`}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Students ── */}
      {tab === 'students' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-base font-semibold text-slate-900">
              Students ({filteredStudents.length})
            </h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search students..."
                  className="pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent w-56"
                />
              </div>
              <Button size="sm" onClick={() => exportToCSV(filteredStudents)}>
                <Download className="w-4 h-4" />
                Export Excel
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="pt-0 px-0 pb-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">EF Score</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400">
                          No students found.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((s) => {
                        const isExpanded = expandedRows.has(s.profile.id);
                        const efData = s.efAssessment?.data as Record<string, string> | undefined;
                        const meData = s.meAssessment?.data as Record<string, string> | undefined;
                        const hasAnswers = s.efAssessment || s.meAssessment;

                        return (
                          <>
                            <tr
                              key={s.profile.id}
                              className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                            >
                              {/* Name */}
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2.5">
                                  <Avatar src={s.profile.avatar_url} name={s.profile.full_name} size="sm" />
                                  <span className="text-sm font-medium text-slate-900 whitespace-nowrap">
                                    {s.profile.full_name ?? 'No name'}
                                  </span>
                                </div>
                              </td>

                              {/* Email */}
                              <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                                {s.profile.email}
                              </td>

                              {/* EF Score */}
                              <td className="px-6 py-4">
                                {s.efAssessment ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-900">
                                      {s.efAssessment.ef_score ?? '—'}<span className="text-slate-400 font-normal">/100</span>
                                    </span>
                                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-sky-500 rounded-full"
                                        style={{ width: `${s.efAssessment.ef_score ?? 0}%` }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400">Not completed</span>
                                )}
                              </td>

                              {/* Expand toggle */}
                              <td className="px-6 py-4">
                                {hasAnswers && (
                                  <button
                                    onClick={() => toggleRow(s.profile.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                    title={isExpanded ? 'Hide answers' : 'View answers'}
                                  >
                                    {isExpanded
                                      ? <ChevronUp className="w-4 h-4" />
                                      : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                )}
                              </td>
                            </tr>

                            {/* Expanded answers row */}
                            {isExpanded && hasAnswers && (
                              <tr key={`${s.profile.id}-expanded`} className="bg-slate-50 border-b border-slate-100">
                                <td colSpan={4} className="px-6 py-5">
                                  <div className="space-y-5">
                                    {/* EF Answers */}
                                    {s.efAssessment && efData && (
                                      <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                          EF Assessment Answers
                                        </p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                          {EF_QUESTIONS.map((q) => (
                                            <div key={q.id} className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                                              <p className="text-xs text-slate-400 mb-1">{q.label}</p>
                                              <p className="text-xl font-bold text-sky-700">
                                                {efData[q.id] ?? '—'}
                                                <span className="text-sm text-slate-400 font-normal">/5</span>
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Me-manual Answers */}
                                    {s.meAssessment && meData && (
                                      <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                          Me-manual Answers
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                          {ME_FIELDS.map((f) =>
                                            meData[f.key] ? (
                                              <div key={f.key} className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                                                <p className="text-xs text-slate-400 mb-1">{f.label}</p>
                                                <p className="text-sm text-slate-700 leading-relaxed">{meData[f.key]}</p>
                                              </div>
                                            ) : null
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Manage Users ── */}
      {tab === 'users' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">Users ({profiles.length})</h2>
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
                      <th key={h} className="pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wide pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={user.avatar_url} name={user.full_name} size="sm" />
                          <span className="text-sm font-medium text-slate-900 whitespace-nowrap">{user.full_name ?? 'No name'}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm text-slate-500 whitespace-nowrap">{user.email}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={user.role === 'admin' ? 'warning' : 'info'}>{user.role}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-sm text-slate-400 whitespace-nowrap">{formatDate(user.created_at)}</td>
                      <td className="py-3">
                        <Button variant="ghost" size="sm" onClick={() => handleRoleChange(user, user.role === 'admin' ? 'user' : 'admin')}>
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

      {/* ── Resources ── */}
      {tab === 'resources' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Support Resources ({resources.length})</h2>
            <Button size="sm" onClick={() => { resetResourceForm(); setShowResourceForm(true); }}>
              <Plus className="w-4 h-4" />
              Add Resource
            </Button>
          </div>

          {showResourceForm && (
            <Card className="border-sky-200">
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">
                  {editingResource ? 'Edit Resource' : 'New Resource'}
                </h3>
                <form onSubmit={handleSaveResource} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
                    <input type="text" value={resourceForm.title ?? ''} onChange={(e) => setResourceForm((f) => ({ ...f, title: e.target.value }))} required className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Category *</label>
                    <select value={resourceForm.category ?? 'mental_health'} onChange={(e) => setResourceForm((f) => ({ ...f, category: e.target.value as ResourceCategory }))} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500">
                      <option value="mental_health">Mental Health</option>
                      <option value="physical_health">Physical Health</option>
                      <option value="late_diagnosis">Late Diagnosis</option>
                      <option value="social_groups">Social Groups</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Provider Name</label>
                    <input type="text" value={resourceForm.provider_name ?? ''} onChange={(e) => setResourceForm((f) => ({ ...f, provider_name: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">External URL</label>
                    <input type="url" value={resourceForm.external_url ?? ''} onChange={(e) => setResourceForm((f) => ({ ...f, external_url: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="https://" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Booking URL</label>
                    <input type="url" value={resourceForm.booking_url ?? ''} onChange={(e) => setResourceForm((f) => ({ ...f, booking_url: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="https://" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                    <textarea value={resourceForm.description ?? ''} onChange={(e) => setResourceForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none" />
                  </div>
                  <div className="sm:col-span-2 flex gap-3">
                    <Button type="submit" loading={savingResource}>{editingResource ? 'Save changes' : 'Add resource'}</Button>
                    <Button type="button" variant="secondary" onClick={resetResourceForm}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-slate-100">
                      {['Title', 'Category', 'Provider', 'Status', 'Actions'].map((h) => (
                        <th key={h} className="pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wide pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {resources.map((resource) => (
                      <tr key={resource.id}>
                        <td className="py-3 pr-4">
                          <p className="text-sm font-medium text-slate-900">{resource.title}</p>
                          {resource.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{resource.description}</p>}
                        </td>
                        <td className="py-3 pr-4"><Badge variant="default">{resource.category.replace('_', ' ')}</Badge></td>
                        <td className="py-3 pr-4 text-sm text-slate-500">{resource.provider_name ?? '—'}</td>
                        <td className="py-3 pr-4"><Badge variant={resource.is_active ? 'success' : 'default'}>{resource.is_active ? 'Active' : 'Inactive'}</Badge></td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleToggleResource(resource)} title={resource.is_active ? 'Deactivate' : 'Activate'}>
                              {resource.is_active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => startEditResource(resource)}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteResource(resource)} className="text-red-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {resources.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No resources yet. Add one above.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
