'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings as SettingsIcon, Building, Clock, CalendarDays, Moon, Sun, Save, KeyRound } from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useToast } from '../../components/Toast';
import { api, getStoredUser } from '../../lib/api';

export default function SettingsPage() {
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({
    companyName: 'MetaGlide Marketing',
    tagline: 'Effortless Digital Growth',
    workHours: {
      startTime: '09:00',
      endTime: '18:00',
      lateThresholdTime: '09:30',
      workDaysPerWeek: 5,
      weeklyTargetHours: 40,
    },
    leaveQuotas: {
      casual: 10,
      sick: 10,
      annual: 14,
    },
    departments: [
      'Executive',
      'Engineering',
      'Marketing',
      'Sales',
      'Product Design',
      'Operations',
      'Human Resources',
      'Finance',
    ],
  });

  useEffect(() => {
    setCurrentUser(getStoredUser());
    api.settings
      .get()
      .then((res: any) => {
        if (res.settings) setSettings(res.settings);
      })
      .catch((err) => console.error('Error loading settings:', err));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== 'Admin') {
      toast.warning('Admin Only', 'Only Administrators can update organization settings.');
      return;
    }

    setSaving(true);
    try {
      const res: any = await api.settings.update(settings);
      toast.success('Settings Saved', 'Organization parameters updated successfully.');
      if (res.settings) setSettings(res.settings);
    } catch (err: any) {
      toast.error('Save Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = currentUser?.role === 'Admin';

  return (
    <DashboardLayout title="Organization Setup & Settings">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--navy)] dark:text-white tracking-tight">
            Organization Configuration
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Configure company branding, official shift schedules, late grace periods, and leave quotas.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Company Brand Settings */}
          <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)] text-[#0A66C2]">
              <Building className="w-5 h-5" />
              <h3 className="font-bold text-sm text-[var(--navy)] dark:text-white">
                Company Brand & Profile
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={settings.companyName || ''}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Official Tagline
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={settings.tagline || ''}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {/* Shift & Work Hours */}
          <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)] text-[#10AEE6]">
              <Clock className="w-5 h-5" />
              <h3 className="font-bold text-sm text-[var(--navy)] dark:text-white">
                Work Shift & Late Grace Period
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Shift Start Time
                </label>
                <input
                  type="time"
                  disabled={!isAdmin}
                  value={settings.workHours?.startTime || '09:00'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      workHours: { ...settings.workHours, startTime: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Shift End Time
                </label>
                <input
                  type="time"
                  disabled={!isAdmin}
                  value={settings.workHours?.endTime || '18:00'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      workHours: { ...settings.workHours, endTime: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Late Threshold Time (Grace Period)
                </label>
                <input
                  type="time"
                  disabled={!isAdmin}
                  value={settings.workHours?.lateThresholdTime || '09:30'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      workHours: { ...settings.workHours, lateThresholdTime: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {/* Annual Leave Quotas */}
          <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)] text-[#1DE0FF]">
              <CalendarDays className="w-5 h-5 text-[#0A66C2]" />
              <h3 className="font-bold text-sm text-[var(--navy)] dark:text-white">
                Default Annual Leave Quotas
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Casual Leave (Days)
                </label>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={settings.leaveQuotas?.casual ?? 10}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      leaveQuotas: { ...settings.leaveQuotas, casual: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Sick Leave (Days)
                </label>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={settings.leaveQuotas?.sick ?? 10}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      leaveQuotas: { ...settings.leaveQuotas, sick: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Annual Vacation (Days)
                </label>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={settings.leaveQuotas?.annual ?? 14}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      leaveQuotas: { ...settings.leaveQuotas, annual: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-[#0A66C2] to-[#10AEE6] text-white hover:opacity-95 transition shadow-md shadow-[#0A66C2]/20 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
              </button>
            </div>
          )}
        </form>

        {/* Account Security Card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#0A66C2]/10 dark:bg-[#10AEE6]/15 flex items-center justify-center text-[#0A66C2] dark:text-[#1DE0FF] shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[var(--navy)] dark:text-white">
                Account Credentials & Security
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Update your login password or configure permanent credentials.
              </p>
            </div>
          </div>
          <Link
            href="/change-password"
            className="px-4 py-2 rounded-xl border border-[var(--border)] bg-slate-50 dark:bg-slate-900 text-xs font-bold text-[var(--text)] hover:bg-[#0A66C2] hover:text-white transition shadow-xs inline-flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Change Password</span>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
