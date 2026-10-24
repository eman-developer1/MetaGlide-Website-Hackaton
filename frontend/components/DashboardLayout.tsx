'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { AIChatPanel } from './AIChatPanel';
import { getToken, getStoredUser, setStoredUser, api } from '../lib/api';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const cached = getStoredUser();
    if (cached) {
      setUser(cached);
      if (cached.mustChangePassword && pathname !== '/change-password') {
        router.push('/change-password');
        return;
      }
    }

    // Verify token with backend
    api.auth
      .getMe()
      .then((res: any) => {
        if (res.success && res.user) {
          setUser(res.user);
          setStoredUser(res.user);
          if (res.user.mustChangePassword && pathname !== '/change-password') {
            router.push('/change-password');
          }
        }
      })
      .catch((err) => {
        console.error('Session validation error:', err);
      })
      .finally(() => setLoading(false));
  }, [router, pathname]);

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0A66C2] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[var(--text-muted)] tracking-wider uppercase">
            Loading MetaGlide HCM...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--bg)] text-[var(--text)]">
      {/* Role-based Sidebar */}
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenAIChat={() => setAiChatOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Topbar
          user={user}
          title={title}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenAIChat={() => setAiChatOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* AI Assistant Floating Drawer */}
      <AIChatPanel
        isOpen={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
        currentUser={user}
      />
    </div>
  );
};
