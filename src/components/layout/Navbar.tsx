'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, LogOut, User, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/Avatar';
import type { Profile } from '@/types';

interface NavbarProps {
  profile: Profile | null;
  onMenuClick: () => void;
}

export function Navbar({ profile, onMenuClick }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-6 shrink-0">
      {/* Hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Spacer on desktop */}
      <div className="hidden lg:block" />

      {/* Right side */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
          aria-label="User menu"
          aria-expanded={dropdownOpen}
        >
          <Avatar src={profile?.avatar_url} name={profile?.full_name} size="sm" />
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-slate-900 leading-none">
              {profile?.full_name ?? 'User'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{profile?.email}</p>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-100 rounded-2xl shadow-lg shadow-slate-200/80 py-2 z-50">
            <div className="px-4 py-2 border-b border-slate-100 mb-1">
              <p className="text-sm font-medium text-slate-900 truncate">
                {profile?.full_name ?? 'User'}
              </p>
              <p className="text-xs text-slate-400 truncate">{profile?.email}</p>
            </div>

            <a
              href="/profile"
              className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              onClick={() => setDropdownOpen(false)}
            >
              <User className="w-4 h-4 text-slate-400" />
              My Profile
            </a>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
