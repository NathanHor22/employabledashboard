'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { CheckCircle2, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { Assessment } from '@/types';

const EF_QUESTIONS = [
  { id: 'planning', label: 'Planning & Organization', description: 'How well do you plan tasks and organize your time?' },
  { id: 'working_memory', label: 'Working Memory', description: 'How well do you hold and use information in your mind?' },
  { id: 'flexibility', label: 'Cognitive Flexibility', description: 'How easily do you adapt to changes and new situations?' },
  { id: 'impulse_control', label: 'Impulse Control', description: 'How well do you manage impulsive reactions?' },
  { id: 'emotional_regulation', label: 'Emotional Regulation', description: 'How well do you manage your emotions under stress?' },
  { id: 'task_initiation', label: 'Task Initiation', description: 'How easily do you start tasks without procrastinating?' },
];

const ME_MANUAL_SECTIONS = [
  {
    id: 'communication',
    label: 'Communication Style',
    fields: [
      { id: 'preferred_style', label: 'How do you prefer to receive feedback?' },
      { id: 'best_time', label: 'When are you most productive?' },
      { id: 'challenges', label: 'What communication challenges do you experience?' },
    ],
  },
  {
    id: 'work_environment',
    label: 'Work Environment',
    fields: [
      { id: 'ideal_env', label: 'Describe your ideal work environment' },
      { id: 'distractions', label: 'What distractions affect your focus?' },
      { id: 'accommodations', label: 'What accommodations help you perform best?' },
    ],
  },
  {
    id: 'strengths',
    label: 'Strengths & Challenges',
    fields: [
      { id: 'strengths', label: 'What are your key strengths at work?' },
      { id: 'growth_areas', label: 'What areas are you actively improving?' },
    ],
  },
];

function SuccessModal({
  type,
  score,
  onClose,
}: {
  type: 'ef' | 'me_manual';
  score: number | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Assessment submitted!</h2>
        <p className="text-slate-500 text-sm mb-4">
          {type === 'ef'
            ? 'Your Executive Function assessment has been recorded.'
            : 'Your Me-manual has been saved successfully.'}
        </p>
        {score !== null && (
          <div className="flex items-center justify-center mb-4">
            <div className="flex flex-col items-center gap-1 px-6 py-4 bg-sky-50 rounded-2xl border border-sky-100">
              <span className="text-xs text-sky-600 font-medium uppercase tracking-wide">EF Score</span>
              <span className="text-4xl font-bold text-sky-700">{score}</span>
              <span className="text-xs text-slate-400">out of 100</span>
            </div>
          </div>
        )}
        <p className="text-xs text-slate-400 mb-6">You can view your results on the Profile page.</p>
        <Button onClick={onClose} className="w-full">Done</Button>
      </div>
    </div>
  );
}

export default function AssessmentsPage() {
  const supabase = createClient();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'ef' | 'me_manual'>('ef');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [currentDraft, setCurrentDraft] = useState<Assessment | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState<{ type: 'ef' | 'me_manual'; score: number | null } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error in assessments:', authError);
      return;
    }

    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) console.error('Assessments fetch error:', error);
    setAssessments(data ?? []);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const draft = assessments.find((a) => a.type === activeTab && a.status === 'draft');
    setCurrentDraft(draft ?? null);
    setFormData(draft ? (draft.data as Record<string, string>) : {});
  }, [activeTab, assessments]);

  function updateField(key: string, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveDraft() {
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast('error', 'Session expired', 'Please refresh the page.');
      setSaving(false);
      return;
    }

    const payload = { user_id: user.id, type: activeTab, data: formData, status: 'draft' as const };

    let error;
    if (currentDraft) {
      ({ error } = await supabase.from('assessments').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', currentDraft.id));
    } else {
      ({ error } = await supabase.from('assessments').insert(payload));
    }

    if (error) {
      console.error('Save draft error:', error);
      toast('error', 'Save failed', error.message);
    } else {
      toast('success', 'Draft saved', 'Your progress has been saved.');
      await loadData();
    }
    setSaving(false);
  }

  async function handleSubmit() {
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast('error', 'Session expired', 'Please refresh the page.');
      setSubmitting(false);
      return;
    }

    const hasData = Object.values(formData).some((v) => v.trim());
    if (!hasData) {
      toast('error', 'Nothing to submit', 'Please fill in at least one field before submitting.');
      setSubmitting(false);
      return;
    }

    const efScore =
      activeTab === 'ef'
        ? Math.round(
            (EF_QUESTIONS.reduce((sum, q) => sum + (parseInt(formData[q.id] ?? '0') || 0), 0) /
              EF_QUESTIONS.length) * 20
          )
        : null;

    const payload = {
      user_id: user.id,
      type: activeTab,
      data: formData,
      status: 'submitted' as const,
      ef_score: efScore,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (currentDraft) {
      ({ error } = await supabase.from('assessments').update(payload).eq('id', currentDraft.id));
    } else {
      ({ error } = await supabase.from('assessments').insert(payload));
    }

    if (error) {
      console.error('Assessment submit error:', error);
      toast('error', 'Submit failed', error.message);
    } else {
      setFormData({});
      await loadData();
      setSuccessModal({ type: activeTab, score: efScore });
    }
    setSubmitting(false);
  }

  const completedAssessments = assessments.filter((a) => a.status === 'submitted');

  return (
    <>
      {successModal && (
        <SuccessModal
          type={successModal.type}
          score={successModal.score}
          onClose={() => setSuccessModal(null)}
        />
      )}

      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assessments</h1>
          <p className="text-slate-500 mt-1">Complete your EF assessment and Me-manual</p>
        </div>

        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          {(['ef', 'me_manual'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'ef' ? 'EF Assessment' : 'Me-manual'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-slate-900">
                    {activeTab === 'ef' ? 'Executive Function Assessment' : 'Me-manual'}
                  </h2>
                  {currentDraft && <Badge variant="warning">Draft saved</Badge>}
                </div>

                {activeTab === 'ef' ? (
                  <div className="space-y-6">
                    <p className="text-sm text-slate-500">
                      Rate each area from 1 (very low) to 5 (very high) based on your current experience.
                    </p>
                    {EF_QUESTIONS.map((q) => (
                      <div key={q.id}>
                        <label className="block text-sm font-medium text-slate-800 mb-0.5">{q.label}</label>
                        <p className="text-xs text-slate-400 mb-3">{q.description}</p>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((v) => (
                            <button
                              key={v}
                              onClick={() => updateField(q.id, String(v))}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                                formData[q.id] === String(v)
                                  ? 'border-sky-500 bg-sky-500 text-white'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300'
                              }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ME_MANUAL_SECTIONS.map((section) => {
                      const isExpanded = expandedSections[section.id] !== false;
                      return (
                        <div key={section.id} className="border border-slate-200 rounded-xl overflow-hidden">
                          <button
                            onClick={() => setExpandedSections((prev) => ({ ...prev, [section.id]: !isExpanded }))}
                            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                          >
                            <span className="text-sm font-semibold text-slate-800">{section.label}</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </button>
                          {isExpanded && (
                            <div className="p-4 space-y-4">
                              {section.fields.map((field) => (
                                <div key={field.id}>
                                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{field.label}</label>
                                  <textarea
                                    value={formData[`${section.id}_${field.id}`] ?? ''}
                                    onChange={(e) => updateField(`${section.id}_${field.id}`, e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
                                    placeholder="Type your response here..."
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-3 mt-6 pt-6 border-t border-slate-100">
                  <Button variant="secondary" onClick={handleSaveDraft} loading={saving}>
                    Save draft
                  </Button>
                  <Button onClick={handleSubmit} loading={submitting}>
                    Submit assessment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Completed</h3>
                {completedAssessments.length === 0 ? (
                  <p className="text-xs text-slate-400">No completed assessments yet.</p>
                ) : (
                  <div className="space-y-2">
                    {completedAssessments.map((a) => (
                      <div key={a.id} className="p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-slate-800">
                            {a.type === 'ef' ? 'EF Assessment' : 'Me-manual'}
                          </p>
                          <Badge variant="success">Done</Badge>
                        </div>
                        {a.ef_score !== null && (
                          <p className="text-xs text-slate-500">Score: <strong>{a.ef_score}/100</strong></p>
                        )}
                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(a.updated_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
