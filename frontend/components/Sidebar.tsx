'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  Megaphone,
  Bell,
  ShieldAlert,
  Settings,
  KeyRound,
  LogOut,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { removeToken } from '../lib/api';

interface SidebarProps {
  user: any;
  isOpen: boolean;
  onClose?: () => void;
  onOpenAIChat?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  isOpen,
  onClose,
  onOpenAIChat,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const role = user?.role || 'Employee';

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  const navItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['Admin', 'HR', 'Employee'],
    },
    {
      title: 'Roles & Team',
      href: '/admin/roles-team',
      icon: ShieldCheck,
      roles: ['Admin'],
    },
    {
      title: 'Employees',
      href: '/employees',
      icon: Users,
      roles: ['Admin', 'HR'],
    },
    {
      title: role === 'Employee' ? 'My Attendance' : 'Attendance',
      href: '/attendance',
      icon: CalendarCheck,
      roles: ['Admin', 'HR', 'Employee'],
    },
    {
      title: role === 'Employee' ? 'My Leaves' : 'Leave Management',
      href: '/leave',
      icon: CalendarDays,
      roles: ['Admin', 'HR', 'Employee'],
    },
    {
      title: role === 'Employee' ? 'My Payslips' : 'Payroll Lite',
      href: '/payroll',
      icon: CreditCard,
      roles: ['Admin', 'HR', 'Employee'],
    },
    {
      title: 'Announcements',
      href: '/announcements',
      icon: Megaphone,
      roles: ['Admin', 'HR', 'Employee'],
    },
    {
      title: 'Notifications',
      href: '/notifications',
      icon: Bell,
      roles: ['Admin', 'HR', 'Employee'],
    },
    {
      title: 'Audit Log',
      href: '/audit-log',
      icon: ShieldAlert,
      roles: ['Admin', 'HR'],
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
      roles: ['Admin', 'HR'],
    },
    {
      title: 'Change Password',
      href: '/change-password',
      icon: KeyRound,
      roles: ['Admin', 'HR', 'Employee'],
    },
  ];

  const filteredNav = navItems.filter((item) => item.roles.includes(role));

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-xs"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#12213F] text-slate-100 flex flex-col border-r border-slate-800 transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-md bg-white p-1 shrink-0 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="MetaGlide Marketing Logo"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-white group-hover:text-[#1DE0FF] transition">
                MetaGlide
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#10AEE6]">
                MARKETING
              </div>
            </div>
          </Link>
        </div>

        {/* Tagline Badge */}
        <div className="px-5 py-2.5 bg-slate-900/40 border-b border-slate-800/60 text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1DE0FF] animate-pulse" />
          Effortless Digital Growth
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-[#0A66C2] to-[#10AEE6] text-white shadow-md shadow-[#0A66C2]/20 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#1DE0FF]'
                    }`}
                  />
                  <span>{item.title}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-white/70" />}
              </Link>
            );
          })}

          {/* AI Assistant Quick Trigger */}
          <div className="pt-4 mt-4 border-t border-slate-800/60">
            <button
              type="button"
              onClick={() => {
                if (onClose) onClose();
                if (onOpenAIChat) onOpenAIChat();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-[#0A66C2]/30 via-[#10AEE6]/20 to-[#1DE0FF]/30 border border-[#10AEE6]/40 text-[#1DE0FF] hover:bg-[#0A66C2]/40 transition shadow-xs group"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#1DE0FF] animate-spin-slow" />
                <span>AI Assistant</span>
              </div>
              <span className="text-[10px] bg-[#0A66C2] text-white px-2 py-0.5 rounded-full font-bold">
                PRO
              </span>
            </button>
          </div>
        </nav>

        {/* Current User & Logout */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0A66C2] to-[#1DE0FF] flex items-center justify-center font-bold text-xs text-white shrink-0">
                {(user?.name || 'User')
                  .split(' ')
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{user?.name || 'Logged In'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                      role === 'Admin'
                        ? 'bg-purple-900/60 text-purple-300 border border-purple-700/50'
                        : role === 'HR'
                        ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                        : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                    }`}
                  >
                    {role}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
