'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Menu,
  Bell,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  User,
} from 'lucide-react';
import { api } from '../lib/api';
import { ThemeToggle } from './ThemeToggle';

interface TopbarProps {
  user: any;
  title: string;
  onToggleSidebar: () => void;
  onOpenAIChat?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  user,
  title,
  onToggleSidebar,
  onOpenAIChat,
}) => {
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'in-memory'>('checking');
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  // Health check & notifications
  useEffect(() => {
    api.auth
      .health()
      .then((res: any) => {
        if (res.database === 'connected') {
          setDbStatus('connected');
        } else {
          setDbStatus('in-memory');
        }
      })
      .catch(() => setDbStatus('in-memory'));

    api.notifications
      .list()
      .then((res: any) => {
        if (res.unreadCount !== undefined) {
          setUnreadNotifs(res.unreadCount);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-[var(--card)]/80 backdrop-blur-md border-b border-[var(--border)] transition-colors">
      {/* Left: Mobile Menu Trigger & Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-xl border border-[var(--border)] lg:hidden text-[var(--text)] hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-extrabold text-[var(--navy)] dark:text-white tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      {/* Right: Status Pill, Notifications, AI Button, Dark Mode, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Backend & DB Status Badge */}
        <div
          title={`Backend status: Online | Database: ${dbStatus}`}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-[var(--border)] bg-slate-50 dark:bg-slate-900"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              dbStatus === 'connected'
                ? 'bg-emerald-500 animate-pulse'
                : dbStatus === 'in-memory'
                ? 'bg-amber-500'
                : 'bg-slate-400'
            }`}
          />
          <span className="text-[var(--text-muted)]">
            DB: {dbStatus === 'connected' ? 'MongoDB' : 'In-Memory Store'}
          </span>
        </div>

        {/* AI Assistant Quick Trigger */}
        {onOpenAIChat && (
          <button
            type="button"
            onClick={onOpenAIChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#0A66C2] via-[#10AEE6] to-[#1DE0FF] text-white hover:opacity-90 shadow-sm transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        )}

        {/* Notifications Icon */}
        <Link
          href="/notifications"
          className="relative p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-[var(--border)] transition"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadNotifs > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-[var(--card)]">
              {unreadNotifs > 9 ? '9+' : unreadNotifs}
            </span>
          )}
        </Link>

        {/* Dark Mode Toggle */}
        <ThemeToggle />

        {/* Change Password Link */}
        <Link
          href="/change-password"
          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-[var(--border)] transition hidden sm:flex"
          title="Change Password"
        >
          <KeyRound className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
};
