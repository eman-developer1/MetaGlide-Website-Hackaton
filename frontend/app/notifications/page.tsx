'use client';

import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useToast } from '../../components/Toast';
import { api } from '../../lib/api';

export default function NotificationsPage() {
  const toast = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res: any = await api.notifications.list();
      setNotifications(res.notifications || []);
    } catch (err: any) {
      toast.error('Failed to load notifications', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markRead();
      toast.success('All Marked as Read');
      fetchNotifications();
    } catch (err: any) {
      toast.error('Action Failed', err.message);
    }
  };

  return (
    <DashboardLayout title="Your Notifications">
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-[var(--navy)] dark:text-white tracking-tight">
              Activity & Workflow Alerts
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Updates regarding attendance corrections, leave approvals, and payroll runs.
            </p>
          </div>

          {notifications.some((n) => !n.read) && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <CheckCheck className="w-4 h-4 text-emerald-500" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        <div className="space-y-3">
          {notifications.length > 0 ? (
            notifications.map((n) => {
              const iconMap = {
                success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
                warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
                danger: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />,
                info: <Info className="w-5 h-5 text-[#0A66C2] shrink-0" />,
              };

              return (
                <div
                  key={n._id || n.id}
                  className={`p-4 rounded-2xl border transition flex items-start gap-3.5 ${
                    n.read
                      ? 'bg-[var(--card)] border-[var(--border)] opacity-80'
                      : 'bg-blue-50/50 dark:bg-slate-900 border-[#0A66C2]/30 shadow-xs'
                  }`}
                >
                  {iconMap[n.type as keyof typeof iconMap] || iconMap.info}
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-[var(--navy)] dark:text-white">
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 text-[var(--text)] leading-relaxed">{n.message}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              <Bell className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
              <h4 className="font-bold text-sm">No Notifications</h4>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                You are all caught up! There are no unread alerts at this time.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
