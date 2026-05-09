import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { calculateProfileCompletion, formatDate } from '@/lib/utils';
import {
  FileText,
  Brain,
  HeartPulse,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import type { Profile, Resume, Assessment } from '@/types';

function CircularProgress({ value }: { value: number }) {
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="88" height="88" className="-rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute text-lg font-bold text-slate-900">{value}%</span>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [profileRes, resumesRes, assessmentsRes, resourcesRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('resumes').select('*').eq('user_id', user.id).order('uploaded_at', { ascending: false }),
    supabase.from('assessments').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
    supabase.from('support_resources').select('id').eq('is_active', true),
  ]);

  const profile: Profile | null = profileRes.data;
  const resumes: Resume[] = resumesRes.data ?? [];
  const assessments: Assessment[] = assessmentsRes.data ?? [];
  const resourceCount = resourcesRes.data?.length ?? 0;

  const profileCompletion = profile ? calculateProfileCompletion(profile) : 0;
  const currentResume = resumes.find((r) => r.is_current) ?? resumes[0];
  const latestAssessment = assessments[0];
  const assessmentStatus = latestAssessment?.status ?? 'none';

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Hi {firstName}, here&apos;s your overview
        </h1>
        <p className="text-slate-500 mt-1">Track your employment journey progress</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Profile completion */}
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <CircularProgress value={profileCompletion} />
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Profile</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {profileCompletion < 100 ? 'Incomplete' : 'Complete'}
              </p>
              {profileCompletion < 100 && (
                <Link
                  href="/profile"
                  className="text-xs text-sky-600 hover:text-sky-700 mt-1 inline-flex items-center gap-0.5"
                >
                  Update <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resume */}
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div
              className={`flex items-center justify-center w-14 h-14 rounded-2xl shrink-0 ${
                currentResume ? 'bg-green-100' : 'bg-orange-100'
              }`}
            >
              <FileText
                className={`w-7 h-7 ${currentResume ? 'text-green-600' : 'text-orange-500'}`}
              />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Resume</p>
              {currentResume ? (
                <>
                  <Badge variant="success" className="mt-0.5">Uploaded</Badge>
                  <p className="text-xs text-slate-400 mt-1">{formatDate(currentResume.uploaded_at)}</p>
                </>
              ) : (
                <>
                  <Badge variant="warning" className="mt-0.5">Missing</Badge>
                  <Link
                    href="/resume"
                    className="text-xs text-sky-600 hover:text-sky-700 mt-1 inline-flex items-center gap-0.5"
                  >
                    Upload <ArrowRight className="w-3 h-3" />
                  </Link>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Assessment */}
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div
              className={`flex items-center justify-center w-14 h-14 rounded-2xl shrink-0 ${
                assessmentStatus === 'submitted'
                  ? 'bg-sky-100'
                  : assessmentStatus === 'draft'
                  ? 'bg-orange-100'
                  : 'bg-slate-100'
              }`}
            >
              <Brain
                className={`w-7 h-7 ${
                  assessmentStatus === 'submitted'
                    ? 'text-sky-600'
                    : assessmentStatus === 'draft'
                    ? 'text-orange-500'
                    : 'text-slate-400'
                }`}
              />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Assessment</p>
              {assessmentStatus === 'submitted' ? (
                <Badge variant="info" className="mt-0.5">Completed</Badge>
              ) : assessmentStatus === 'draft' ? (
                <>
                  <Badge variant="warning" className="mt-0.5">In progress</Badge>
                  <Link
                    href="/assessments"
                    className="text-xs text-sky-600 hover:text-sky-700 mt-1 inline-flex items-center gap-0.5"
                  >
                    Continue <ArrowRight className="w-3 h-3" />
                  </Link>
                </>
              ) : (
                <>
                  <Badge variant="default" className="mt-0.5">Not started</Badge>
                  <Link
                    href="/assessments"
                    className="text-xs text-sky-600 hover:text-sky-700 mt-1 inline-flex items-center gap-0.5"
                  >
                    Start <ArrowRight className="w-3 h-3" />
                  </Link>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resources */}
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-100 shrink-0">
              <HeartPulse className="w-7 h-7 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Resources</p>
              <p className="text-2xl font-bold text-slate-900">{resourceCount}</p>
              <Link
                href="/resources"
                className="text-xs text-sky-600 hover:text-sky-700 mt-1 inline-flex items-center gap-0.5"
              >
                Browse <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/resume"
                className="flex items-center gap-4 p-4 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-100 transition-colors group"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-500 shrink-0">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Upload Resume</p>
                  <p className="text-xs text-slate-500">PDF, max 10MB</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </Link>

              <Link
                href="/assessments"
                className="flex items-center gap-4 p-4 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-100 transition-colors group"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500 shrink-0">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Complete Assessment</p>
                  <p className="text-xs text-slate-500">EF & Me-manual</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </Link>

              <Link
                href="/resources"
                className="flex items-center gap-4 p-4 rounded-xl bg-green-50 hover:bg-green-100 border border-green-100 transition-colors group"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-500 shrink-0">
                  <HeartPulse className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Browse Support Resources</p>
                  <p className="text-xs text-slate-500">Mental health, physical, social</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {currentResume && (
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Resume uploaded</p>
                    <p className="text-xs text-slate-400">{currentResume.file_name} · {formatDate(currentResume.uploaded_at)}</p>
                  </div>
                </div>
              )}

              {latestAssessment && (
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-100 shrink-0 mt-0.5">
                    {latestAssessment.status === 'submitted' ? (
                      <CheckCircle2 className="w-4 h-4 text-sky-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-orange-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {latestAssessment.type === 'ef' ? 'EF Assessment' : 'Me-manual'}{' '}
                      {latestAssessment.status === 'submitted' ? 'completed' : 'in progress'}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(latestAssessment.updated_at)}</p>
                  </div>
                </div>
              )}

              {!currentResume && !latestAssessment && (
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">No activity yet</p>
                    <p className="text-xs text-slate-400">Get started with the quick actions</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
