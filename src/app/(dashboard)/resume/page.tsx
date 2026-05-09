'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatBytes, formatDate } from '@/lib/utils';
import { Upload, FileText, Download, Trash2, Star } from 'lucide-react';
import type { Resume } from '@/types';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function ResumePage() {
  const supabase = createClient();
  const toast = useToast();

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const loadResumes = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false });

    setResumes(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadResumes(); }, [loadResumes]);

  async function handleUpload(file: File) {
    if (!userId) return;

    if (file.type !== 'application/pdf') {
      toast('error', 'Invalid file type', 'Only PDF files are allowed.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast('error', 'File too large', 'Resume must be under 10MB.');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${userId}/${Date.now()}_${safeName}`;

    setUploadProgress(30);
    const { error: storageError } = await supabase.storage
      .from('resumes')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (storageError) {
      toast('error', 'Upload failed', storageError.message);
      setUploading(false);
      setUploadProgress(0);
      return;
    }

    setUploadProgress(70);
    await supabase.from('resumes').update({ is_current: false }).eq('user_id', userId);
    setUploadProgress(85);

    const { error: dbError } = await supabase.from('resumes').insert({
      user_id: userId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      is_current: true,
    });

    if (dbError) {
      await supabase.storage.from('resumes').remove([filePath]);
      toast('error', 'Save failed', dbError.message);
    } else {
      toast('success', 'Resume uploaded!', `${file.name} is now your current resume.`);
      await loadResumes();
    }

    setUploadProgress(100);
    setTimeout(() => setUploadProgress(0), 600);
    setUploading(false);
  }

  async function handleSetCurrent(resume: Resume) {
    if (!userId) return;
    await supabase.from('resumes').update({ is_current: false }).eq('user_id', userId);
    await supabase.from('resumes').update({ is_current: true }).eq('id', resume.id);
    toast('success', 'Resume updated', `${resume.file_name} is now your current resume.`);
    await loadResumes();
  }

  async function handleDelete(resume: Resume) {
    if (!confirm(`Delete "${resume.file_name}"? This cannot be undone.`)) return;
    await supabase.storage.from('resumes').remove([resume.file_path]);
    await supabase.from('resumes').delete().eq('id', resume.id);
    toast('success', 'Resume deleted');
    await loadResumes();
  }

  async function handleDownload(resume: Resume) {
    const { data } = await supabase.storage
      .from('resumes')
      .createSignedUrl(resume.file_path, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    } else {
      toast('error', 'Download failed', 'Could not generate download link.');
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  const currentResume = resumes.find((r) => r.is_current);
  const pastResumes = resumes.filter((r) => !r.is_current);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Resume</h1>
        <p className="text-slate-500 mt-1">Upload and manage your resume</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Resume */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Current Resume</h2>
            {loading ? (
              <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
            ) : currentResume ? (
              <div className="space-y-4">
                <div className="h-48 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2">
                  <FileText className="w-10 h-10 text-slate-300" />
                  <p className="text-sm text-slate-500 font-medium px-4 text-center">{currentResume.file_name}</p>
                  <p className="text-xs text-slate-400">{formatBytes(currentResume.file_size)}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Uploaded {formatDate(currentResume.uploaded_at)}</span>
                  <Badge variant="success">Current</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleDownload(currentResume)} className="flex-1">
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(currentResume)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-48 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2">
                <FileText className="w-10 h-10 text-slate-300" />
                <p className="text-sm text-slate-400">No resume uploaded yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload Zone */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Upload New Resume</h2>

            <div
              className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 transition-all cursor-pointer ${
                dragOver ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
              } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('resume-file-input')?.click()}
            >
              <input
                id="resume-file-input"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.target.value = '';
                }}
              />
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-100">
                <Upload className={`w-7 h-7 text-sky-500 transition-transform ${dragOver ? 'scale-110' : ''}`} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">Drag & drop your resume here</p>
                <p className="text-xs text-slate-400 mt-1">or click to browse files</p>
              </div>
              <p className="text-xs text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
                PDF only · max 10MB
              </p>
            </div>

            {uploading && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resume History */}
      {pastResumes.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Resume History</h2>
            <div className="space-y-2">
              {pastResumes.map((resume) => (
                <div key={resume.id} className="flex items-center gap-4 py-3 px-4 bg-slate-50 rounded-xl">
                  <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{resume.file_name}</p>
                    <p className="text-xs text-slate-400">
                      {formatBytes(resume.file_size)} · {formatDate(resume.uploaded_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => handleSetCurrent(resume)} title="Set as current">
                      <Star className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(resume)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(resume)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
