'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  User,
  FileText,
  Brain,
  HeartPulse,
  Users,
  Settings,
  BarChart3,
  X,
} from 'lucide-react';
import type { Profile } from '@/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/profile', label: 'My Profile', icon: User },
  { href: '/resume', label: 'My Resume', icon: FileText },
  { href: '/assessments', label: 'Assessments', icon: Brain },
  { href: '/resources', label: 'Support Resources', icon: HeartPulse },
  { href: '/social-groups', label: 'Social Groups', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/admin', label: 'Manage Company', icon: BarChart3, adminOnly: true },
];

interface SidebarProps {
  profile: Profile | null;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ profile, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = profile?.role === 'admin';

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-30 h-full w-[260px] bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-slate-100 shrink-0">
          <Link href="/dashboard" className="flex items-center" onClick={onClose}>
            <Image src="/logo.png" alt="EmployAble" width={130} height={40} className="h-10 w-auto" />
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0',
                    isActive ? 'text-sky-600' : 'text-slate-400'
                  )}
                />
                {item.label}
                {item.adminOnly && (
                  <span className="ml-auto text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md font-medium">
                    Admin
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 shrink-0">
          <p className="text-xs text-slate-400 text-center">
            © {new Date().getFullYear()} EmployAble
          </p>
        </div>
      </aside>
    </>
  );
}
