'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useToast } from '../../components/Toast';
import { api, getStoredUser, setStoredUser } from '../../lib/api';

export default function ChangePasswordPage() {
  const router = useRouter();
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    setCurrentUser(user);
  }, []);

  // Password Strength Calculation (0 - 4)
  const calculateStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-slate-300 dark:bg-slate-700' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/\d/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-red-500' };
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score: 3, label: 'Good', color: 'bg-blue-500' };
      case 4:
        return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
      default:
        return { score: 0, label: 'Very Weak', color: 'bg-red-500' };
    }
  };

  const strength = calculateStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.warning('Current Password Required', 'Please enter your current password.');
      return;
    }

    if (newPassword.length < 8) {
      toast.warning('Password Too Short', 'New password must contain at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords Mismatch', 'The new password and confirmation password do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      toast.warning('Duplicate Password', 'New password must be different from your current password.');
      return;
    }

    setLoading(true);
    try {
      const res: any = await api.auth.changePassword(currentPassword, newPassword);
      if (res.success) {
        toast.success('Password Updated', 'Your password has been changed successfully!');
        
        // Clear local mustChangePassword flag on cached user
        const stored = getStoredUser();
        if (stored) {
          const updated = { ...stored, mustChangePassword: false };
          setStoredUser(updated);
          setCurrentUser(updated);
        }

        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');

        // Navigate to dashboard
        setTimeout(() => {
          router.push('/dashboard');
        }, 1200);
      } else {
        toast.error('Update Failed', res.message || 'Unable to update password.');
      }
    } catch (err: any) {
      toast.error('Error', err.message || 'An error occurred while changing password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Change Password">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Must change password notice if applicable */}
        {currentUser?.mustChangePassword && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 shadow-sm animate-pulse-subtle">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <p className="font-bold">Security Action Required</p>
              <p className="mt-0.5 opacity-90">
                You logged in with a temporary password or administrator reset. Please set a new secure password to unlock full portal access.
              </p>
            </div>
          </div>
        )}

        {/* Change Password Card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3.5 pb-6 border-b border-[var(--border)]">
            <div className="w-12 h-12 rounded-2xl bg-[#0A66C2]/10 dark:bg-[#10AEE6]/15 flex items-center justify-center text-[#0A66C2] dark:text-[#1DE0FF]">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[var(--navy)] dark:text-white">
                Update Account Password
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Ensure your account is protected with a strong, unique passphrase.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/60 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A66C2] text-[var(--text)] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] p-0.5"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/60 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A66C2] text-[var(--text)] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] p-0.5"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {newPassword && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-muted)]">Password Strength:</span>
                    <span className="font-bold text-[var(--text)]">{strength.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`rounded-full transition-all duration-300 ${
                          strength.score >= step
                            ? strength.color
                            : 'bg-slate-200 dark:bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                  {/* Checklist */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-[var(--text-muted)]">
                    <div className="flex items-center gap-1.5">
                      {newPassword.length >= 8 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span>At least 8 characters</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span>Upper & lower case</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/\d/.test(newPassword) ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span>Contains a number</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/[^A-Za-z0-9]/.test(newPassword) ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span>Special symbol</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/60 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A66C2] text-[var(--text)] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] p-0.5"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1.5 text-[11px] text-red-500 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> Passwords do not match yet.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-muted)] hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0A66C2] via-[#10AEE6] to-[#1DE0FF] text-white text-xs sm:text-sm font-bold hover:opacity-95 transition shadow-md shadow-[#0A66C2]/20 flex items-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
