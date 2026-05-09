'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { ToastProvider } from '@/components/ui/Toast';
import type { Profile } from '@/types';

interface DashboardLayoutClientProps {
  profile: Profile | null;
  children: React.ReactNode;
}

export function DashboardLayoutClient({ profile, children }: DashboardLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="flex h-full">
        <Sidebar
          profile={profile}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Navbar profile={profile} onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto bg-slate-50">
            <div className="max-w-6xl mx-auto p-4 lg:p-8">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
