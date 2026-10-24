'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  ArrowRight,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { DataTable, Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { api, getStoredUser } from '../../lib/api';

export default function LeavePage() {
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'my-leaves' | 'inbox'>('my-leaves');

  // Balances & My Leaves
  const [leaveBalance, setLeaveBalance] = useState<any>({ casual: 0, sick: 0, annual: 0 });
  const [myLeaves, setMyLeaves] = useState<any[]>([]);

  // HR / Admin Inbox
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [inboxCounts, setInboxCounts] = useState<any>({ pending: 0, approved: 0, rejected: 0, total: 0 });

  // Apply Modal & Smart Leave State
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [smartPrompt, setSmartPrompt] = useState('');
  const [parsingSmart, setParsingSmart] = useState(false);
  const [applySubmitting, setApplySubmitting] = useState(false);

  const [leaveForm, setLeaveForm] = useState({
    type: 'Casual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const fetchMyLeaves = async () => {
    try {
      const res: any = await api.leave.getMyLeaves();
      setLeaveBalance(res.balance || { casual: 0, sick: 0, annual: 0 });
      setMyLeaves(res.leaves || []);
    } catch (err: any) {
      console.error('Error fetching my leaves:', err);
    }
  };

  const fetchAllLeaves = async () => {
    try {
      const res: any = await api.leave.getAll();
      setAllLeaves(res.leaves || []);
      setInboxCounts(res.counts || {});
    } catch (err: any) {
      console.error('Error fetching all leaves:', err);
    }
  };

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setLeaveForm((prev) => ({
      ...prev,
      startDate: prev.startDate || today,
      endDate: prev.endDate || today,
    }));

    const user = getStoredUser();
    setCurrentUser(user);
    if (user?.role === 'Admin' || user?.role === 'HR') {
      setActiveTab('inbox');
    }
    fetchMyLeaves();
    if (user?.role === 'Admin' || user?.role === 'HR') {
      fetchAllLeaves();
    }
  }, []);

  // Smart Leave AI Parser
  const handleSmartLeaveParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartPrompt.trim()) return;

    setParsingSmart(true);
    try {
      const res: any = await api.ai.smartLeave(smartPrompt);
      if (res.success && res.leaveData) {
        setLeaveForm({
          type: res.leaveData.type || 'Casual',
          startDate: res.leaveData.start || leaveForm.startDate,
          endDate: res.leaveData.end || leaveForm.endDate,
          reason: res.leaveData.reason || smartPrompt,
        });
        toast.success('AI Extracted Details!', `Type: ${res.leaveData.type}, Dates: ${res.leaveData.start} to ${res.leaveData.end}`);
      }
    } catch (err: any) {
      toast.warning('AI Parsing Notice', 'Could not parse automatically. Please fill the dates manually.');
    } finally {
      setParsingSmart(false);
    }
  };

  // Submit Leave Application
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.type || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      toast.warning('Incomplete Form', 'Please provide type, start date, end date, and reason.');
      return;
    }

    setApplySubmitting(true);
    try {
      await api.leave.apply(leaveForm);
      toast.success('Application Submitted!', 'Your leave request has been dispatched to HR.');
      setApplyModalOpen(false);
      setSmartPrompt('');
      fetchMyLeaves();
      if (currentUser?.role === 'Admin' || currentUser?.role === 'HR') {
        fetchAllLeaves();
      }
    } catch (err: any) {
      toast.error('Application Failed', err.message);
    } finally {
      setApplySubmitting(false);
    }
  };

  // Review Leave (Admin / HR)
  const handleReviewLeave = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      await api.leave.review(id, status);
      toast.success(`Leave Application ${status}!`);
      fetchAllLeaves();
      fetchMyLeaves();
    } catch (err: any) {
      toast.error('Review Action Failed', err.message);
    }
  };

  const isPrivileged = currentUser?.role === 'Admin' || currentUser?.role === 'HR';

  const myColumns: Column<any>[] = [
    {
      key: 'type',
      header: 'Leave Type',
      sortable: true,
      render: (row) => (
        <span className="font-bold text-[var(--navy)] dark:text-white">{row.type} Leave</span>
      ),
    },
    {
      key: 'dates',
      header: 'Dates (Duration)',
      render: (row) => (
        <div>
          <span className="font-mono text-xs">
            {row.startDate} → {row.endDate}
          </span>
          <span className="ml-2 font-bold text-[var(--text-muted)]">({row.days} days)</span>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => <span className="truncate max-w-xs block text-xs">{row.reason}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => {
        const badgeMap = {
          Approved: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
          Pending: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
          Rejected: 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300',
        };
        const color = badgeMap[row.status as keyof typeof badgeMap] || 'bg-slate-100 text-slate-700';
        return <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${color}`}>{row.status}</span>;
      },
    },
    {
      key: 'reviewedBy',
      header: 'Reviewer',
      render: (row) => row.reviewedBy || 'Pending assignment',
    },
  ];

  return (
    <DashboardLayout title="Leave Management & Policies">
      <div className="space-y-6">
        {/* Top Leave Balances Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Casual Leave
              </p>
              <h4 className="mt-1 text-3xl font-extrabold text-[#0A66C2]">
                {leaveBalance?.casual ?? 10}{' '}
                <span className="text-xs font-medium text-[var(--text-muted)]">days left</span>
              </h4>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-[#0A66C2]">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Sick Leave
              </p>
              <h4 className="mt-1 text-3xl font-extrabold text-[#10AEE6]">
                {leaveBalance?.sick ?? 10}{' '}
                <span className="text-xs font-medium text-[var(--text-muted)]">days left</span>
              </h4>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950 flex items-center justify-center text-[#10AEE6]">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Annual Vacation
              </p>
              <h4 className="mt-1 text-3xl font-extrabold text-[#12213F] dark:text-slate-100">
                {leaveBalance?.annual ?? 14}{' '}
                <span className="text-xs font-medium text-[var(--text-muted)]">days left</span>
              </h4>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#12213F] dark:text-slate-100">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Tab Switcher & Apply Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
            {isPrivileged && (
              <button
                type="button"
                onClick={() => setActiveTab('inbox')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition relative ${
                  activeTab === 'inbox'
                    ? 'bg-[var(--card)] text-[var(--navy)] dark:text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                Approval Inbox
                {inboxCounts.pending > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {inboxCounts.pending}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('my-leaves')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === 'my-leaves'
                  ? 'bg-[var(--card)] text-[var(--navy)] dark:text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              My Applications
            </button>
          </div>

          <button
            type="button"
            onClick={() => setApplyModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-[#0A66C2] via-[#10AEE6] to-[#1DE0FF] text-white hover:opacity-95 transition shadow-sm shadow-[#0A66C2]/20"
          >
            <Plus className="w-4 h-4" />
            <span>Apply for Leave</span>
          </button>
        </div>

        {/* ================= 1. APPROVAL INBOX (Admin & HR) ================= */}
        {activeTab === 'inbox' && isPrivileged && (
          <div className="space-y-4">
            <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-[var(--navy)] dark:text-white">
                  Leave Approval Requests
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Pending leave authorizations awaiting management decision.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                  Pending: {inboxCounts.pending}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                  Approved: {inboxCounts.approved}
                </span>
              </div>
            </div>

            {allLeaves.filter((l) => l.status === 'Pending').length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allLeaves
                  .filter((l) => l.status === 'Pending')
                  .map((leave: any) => (
                    <div
                      key={leave._id || leave.id}
                      className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-[var(--navy)] dark:text-white">
                            {leave.userName}
                          </h4>
                          <p className="text-xs text-[var(--text-muted)]">
                            {leave.department} • {leave.type} Leave ({leave.days} days)
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Awaiting Approval
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs space-y-1">
                        <p>
                          <span className="text-[var(--text-muted)]">Date Range:</span>{' '}
                          <strong>
                            {leave.startDate} to {leave.endDate}
                          </strong>
                        </p>
                        <p>
                          <span className="text-[var(--text-muted)]">Reason:</span>{' '}
                          {leave.reason}
                        </p>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                        <button
                          type="button"
                          onClick={() => handleReviewLeave(leave._id || leave.id, 'Rejected')}
                          className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewLeave(leave._id || leave.id, 'Approved')}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition"
                        >
                          Approve Leave
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-[var(--card)] border border-[var(--border)] rounded-2xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <h4 className="font-bold text-sm">No Pending Leave Requests</h4>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  All employee leave applications are currently processed and up to date.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= 2. MY APPLICATIONS TAB ================= */}
        {activeTab === 'my-leaves' && (
          <div className="space-y-4">
            <DataTable
              columns={myColumns}
              data={myLeaves}
              searchKey="type"
              searchPlaceholder="Filter applications by type..."
              emptyTitle="No leave applications submitted"
              emptyDescription="Click 'Apply for Leave' to submit your first leave request."
            />
          </div>
        )}

        {/* ================= APPLY FOR LEAVE MODAL WITH SMART LEAVE AI ================= */}
        <Modal
          isOpen={applyModalOpen}
          onClose={() => setApplyModalOpen(false)}
          title="Apply for Leave"
          description="Type naturally to let Smart Leave AI pre-populate your request, or enter details below."
          maxWidth="lg"
        >
          <div className="space-y-4">
            {/* Smart Leave AI Quick Input */}
            <form
              onSubmit={handleSmartLeaveParse}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-[#0A66C2]/10 via-[#10AEE6]/10 to-[#1DE0FF]/10 border border-[#10AEE6]/30 space-y-2"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0A66C2] dark:text-[#1DE0FF]">
                <Sparkles className="w-4 h-4" />
                <span>Smart Leave AI Natural Language Assistant</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={smartPrompt}
                  onChange={(e) => setSmartPrompt(e.target.value)}
                  placeholder="e.g. Taking 2 days sick leave starting tomorrow due to dental surgery"
                  disabled={parsingSmart}
                  className="flex-1 px-3 py-2 text-xs bg-[var(--card)] border border-[var(--border)] rounded-xl focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={parsingSmart || !smartPrompt.trim()}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-[#0A66C2] text-white hover:bg-[#084e96] disabled:opacity-50 transition shrink-0"
                >
                  {parsingSmart ? 'Parsing...' : 'Fill with AI'}
                </button>
              </div>
            </form>

            {/* Standard Form */}
            <form onSubmit={handleApplySubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Leave Category
                </label>
                <select
                  value={leaveForm.type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A66C2]"
                >
                  <option value="Casual">Casual Leave (Balance: {leaveBalance?.casual ?? 10}d)</option>
                  <option value="Sick">Sick Leave (Balance: {leaveBalance?.sick ?? 10}d)</option>
                  <option value="Annual">Annual Leave (Balance: {leaveBalance?.annual ?? 14}d)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Reason for Absence
                </label>
                <textarea
                  required
                  rows={3}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="Detail the circumstances for this leave request..."
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applySubmitting}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#0A66C2] to-[#10AEE6] text-white hover:opacity-95 transition"
                >
                  {applySubmitting ? 'Submitting...' : 'Submit Leave Request'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
