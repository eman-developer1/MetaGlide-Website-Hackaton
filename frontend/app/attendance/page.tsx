'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Clock,
  UserCheck,
  UserX,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { DataTable, Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { api, getStoredUser } from '../../lib/api';

export default function AttendancePage() {
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'daily' | 'history' | 'corrections'>('daily');

  // Daily Board State
  const [dailyBoard, setDailyBoard] = useState<any[]>([]);
  const [dailyCounts, setDailyCounts] = useState<any>({ total: 0, present: 0, late: 0, onLeave: 0, absent: 0 });
  const [selectedDate, setSelectedDate] = useState<string>('');

  // History State
  const [myHistory, setMyHistory] = useState<any[]>([]);

  // Corrections State
  const [corrections, setCorrections] = useState<any[]>([]);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    date: '',
    requestedCheckIn: '09:00',
    requestedCheckOut: '18:00',
    reason: '',
  });

  const [loading, setLoading] = useState(true);

  const fetchDailyBoard = async (dateStr?: string) => {
    try {
      const res: any = await api.attendance.getDailyBoard(dateStr || selectedDate);
      setDailyBoard(res.board || []);
      setDailyCounts(res.counts || {});
    } catch (err: any) {
      console.error('Error fetching daily board:', err);
    }
  };

  const fetchMyHistory = async () => {
    try {
      const res: any = await api.attendance.getMyHistory();
      setMyHistory(res.records || []);
    } catch (err: any) {
      console.error('Error fetching attendance history:', err);
    }
  };

  const fetchCorrections = async () => {
    try {
      const res: any = await api.attendance.getCorrections();
      setCorrections(res.corrections || []);
    } catch (err: any) {
      console.error('Error fetching corrections:', err);
    }
  };

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setCorrectionForm((prev) => ({ ...prev, date: today }));

    const user = getStoredUser();
    setCurrentUser(user);
    if (user?.role === 'Employee') {
      setActiveTab('history');
    }

    setLoading(true);
    Promise.all([fetchDailyBoard(today), fetchMyHistory(), fetchCorrections()]).finally(() =>
      setLoading(false)
    );
  }, []);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    fetchDailyBoard(e.target.value);
  };

  // Submit Correction Request
  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionForm.date || !correctionForm.reason) {
      toast.warning('Incomplete form', 'Please specify a date and reason.');
      return;
    }

    try {
      await api.attendance.requestCorrection({
        date: correctionForm.date,
        requestedCheckIn: `${correctionForm.date}T${correctionForm.requestedCheckIn}:00`,
        requestedCheckOut: `${correctionForm.date}T${correctionForm.requestedCheckOut}:00`,
        reason: correctionForm.reason,
      });
      toast.success('Submitted', 'Attendance correction submitted for review.');
      setCorrectionModalOpen(false);
      setCorrectionForm({
        date: new Date().toISOString().split('T')[0],
        requestedCheckIn: '09:00',
        requestedCheckOut: '18:00',
        reason: '',
      });
      fetchMyHistory();
      fetchCorrections();
    } catch (err: any) {
      toast.error('Correction Request Failed', err.message);
    }
  };

  // Review Correction (Admin / HR)
  const handleReviewCorrection = async (id: string, action: 'approve' | 'reject') => {
    try {
      await api.attendance.reviewCorrection(id, action);
      toast.success(`Correction ${action}d!`);
      fetchCorrections();
      fetchDailyBoard();
    } catch (err: any) {
      toast.error('Review Failed', err.message);
    }
  };

  const isPrivileged = currentUser?.role === 'Admin' || currentUser?.role === 'HR';

  const dailyColumns: Column<any>[] = [
    {
      key: 'name',
      header: 'Employee',
      render: (row) => (
        <div>
          <span className="font-bold text-[var(--navy)] dark:text-white">{row.name}</span>
          <div className="text-[11px] text-[var(--text-muted)] font-mono">{row.employeeId}</div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (row) => row.department || 'General',
    },
    {
      key: 'checkIn',
      header: 'Check-in',
      render: (row) =>
        row.checkIn
          ? new Date(row.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '—',
    },
    {
      key: 'checkOut',
      header: 'Check-out',
      render: (row) =>
        row.checkOut
          ? new Date(row.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '—',
    },
    {
      key: 'workHours',
      header: 'Hours',
      render: (row) => `${row.workHours || 0} hrs`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const badgeMap = {
          Present: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
          Late: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
          'Half-day': 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300',
          'On Leave': 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
          Absent: 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300',
        };
        const color = badgeMap[row.status as keyof typeof badgeMap] || 'bg-slate-100 text-slate-700';
        return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${color}`}>{row.status}</span>;
      },
    },
  ];

  const historyColumns: Column<any>[] = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (row) => <span className="font-mono font-medium">{row.date}</span>,
    },
    {
      key: 'checkIn',
      header: 'Check-in Time',
      render: (row) =>
        row.checkIn
          ? new Date(row.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '—',
    },
    {
      key: 'checkOut',
      header: 'Check-out Time',
      render: (row) =>
        row.checkOut
          ? new Date(row.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '—',
    },
    {
      key: 'workHours',
      header: 'Work Duration',
      render: (row) => `${row.workHours || 0} hrs`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span
          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
            row.status === 'Present'
              ? 'bg-emerald-100 text-emerald-700'
              : row.status === 'Late'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {row.status}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout title="Attendance & Shift Records">
      <div className="space-y-6">
        {/* Top Controls: Tabs & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
            {isPrivileged && (
              <button
                type="button"
                onClick={() => setActiveTab('daily')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  activeTab === 'daily'
                    ? 'bg-[var(--card)] text-[var(--navy)] dark:text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                Daily Board
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === 'history'
                  ? 'bg-[var(--card)] text-[var(--navy)] dark:text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              My Attendance
            </button>

            {isPrivileged && (
              <button
                type="button"
                onClick={() => setActiveTab('corrections')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition relative ${
                  activeTab === 'corrections'
                    ? 'bg-[var(--card)] text-[var(--navy)] dark:text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                Corrections Inbox
                {corrections.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {corrections.length}
                  </span>
                )}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCorrectionModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Clock className="w-4 h-4 text-[#10AEE6]" />
            <span>Request Correction</span>
          </button>
        </div>

        {/* ================= 1. DAILY BOARD TAB (Admin & HR) ================= */}
        {activeTab === 'daily' && isPrivileged && (
          <div className="space-y-4">
            {/* Header with Date Picker & Counts */}
            <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0A66C2]" />
                <span className="text-xs font-semibold text-[var(--text)]">Select Board Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-lg font-mono focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                  Present: {dailyCounts.present}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                  Late: {dailyCounts.late}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                  On Leave: {dailyCounts.onLeave}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300">
                  Absent: {dailyCounts.absent}
                </span>
              </div>
            </div>

            <DataTable
              columns={dailyColumns}
              data={dailyBoard}
              searchKey="name"
              searchPlaceholder="Filter daily board by employee name..."
              emptyTitle="No attendance logged for this date"
              emptyDescription="Employees will appear as they check in throughout the workday."
            />
          </div>
        )}

        {/* ================= 2. MY ATTENDANCE TAB ================= */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <DataTable
              columns={historyColumns}
              data={myHistory}
              searchKey="date"
              searchPlaceholder="Filter your attendance by date (YYYY-MM-DD)..."
              emptyTitle="No attendance records logged yet"
              emptyDescription="Use the Check-In button on your dashboard to log attendance."
            />
          </div>
        )}

        {/* ================= 3. CORRECTIONS INBOX (Admin & HR) ================= */}
        {activeTab === 'corrections' && isPrivileged && (
          <div className="space-y-4">
            <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-[var(--navy)] dark:text-white">
                  Pending Correction Requests
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Review and verify employee shift adjustments.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#0A66C2]/10 text-[#0A66C2]">
                {corrections.length} pending
              </span>
            </div>

            {corrections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {corrections.map((item: any) => (
                  <div
                    key={item._id || item.id}
                    className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-[var(--navy)] dark:text-white">
                          {item.userName}
                        </h4>
                        <p className="text-xs text-[var(--text-muted)]">
                          {item.department} • Date: {item.date}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Pending HR Review
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs space-y-1">
                      <p>
                        <span className="text-[var(--text-muted)]">Requested Shift:</span>{' '}
                        <strong>09:00 AM – 06:00 PM</strong>
                      </p>
                      <p>
                        <span className="text-[var(--text-muted)]">Reason:</span>{' '}
                        {item.correctionRequest?.reason || 'Shift adjustment'}
                      </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                      <button
                        type="button"
                        onClick={() => handleReviewCorrection(item._id || item.id, 'reject')}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewCorrection(item._id || item.id, 'approve')}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition"
                      >
                        Approve & Correct
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-[var(--card)] border border-[var(--border)] rounded-2xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <h4 className="font-bold text-sm">Inbox Zero</h4>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  All employee attendance correction requests have been reviewed.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= REQUEST CORRECTION MODAL ================= */}
        <Modal
          isOpen={correctionModalOpen}
          onClose={() => setCorrectionModalOpen(false)}
          title="Submit Attendance Correction"
          description="Forgot to check in or out? Submit a formal request to your HR department."
        >
          <form onSubmit={handleCorrectionSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">Date</label>
              <input
                type="date"
                required
                value={correctionForm.date}
                onChange={(e) => setCorrectionForm({ ...correctionForm, date: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl font-mono focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Correct Check-in Time
                </label>
                <input
                  type="time"
                  required
                  value={correctionForm.requestedCheckIn}
                  onChange={(e) =>
                    setCorrectionForm({ ...correctionForm, requestedCheckIn: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Correct Check-out Time
                </label>
                <input
                  type="time"
                  required
                  value={correctionForm.requestedCheckOut}
                  onChange={(e) =>
                    setCorrectionForm({ ...correctionForm, requestedCheckOut: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Reason for Adjustment
              </label>
              <textarea
                required
                rows={3}
                value={correctionForm.reason}
                onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                placeholder="e.g. System maintenance during arrival / power outage"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setCorrectionModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#0A66C2] text-white hover:bg-[#084e96] transition"
              >
                Submit Request
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
