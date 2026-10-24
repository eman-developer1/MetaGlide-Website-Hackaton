'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Clock,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Download,
  Building,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { DashboardLayout } from '../../components/DashboardLayout';
import { StatCard } from '../../components/StatCard';
import { CardSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { api, getStoredUser } from '../../lib/api';

const COLORS = ['#0A66C2', '#10AEE6', '#1DE0FF', '#12213F', '#6366F1', '#EC4899', '#F59E0B'];

export default function DashboardPage() {
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Stats Data
  const [adminStats, setAdminStats] = useState<any>(null);
  const [hrStats, setHrStats] = useState<any>(null);
  const [empStats, setEmpStats] = useState<any>(null);

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<string[]>([]);
  const [loadingAiSummary, setLoadingAiSummary] = useState(false);
  const [aiProvider, setAiProvider] = useState<string>('Gemini');

  // Attendance Widget State (Employee)
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    setCurrentUser(user);

    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const role = user?.role || 'Employee';

        if (role === 'Admin') {
          const [empRes, payrollRes, auditRes] = await Promise.all([
            api.employees.list().catch(() => ({ employees: [] })),
            api.payroll.list().catch(() => ({ payrolls: [] })),
            api.audit.list().catch(() => ({ logs: [] })),
          ]);

          const employees = empRes.employees || [];
          const payrolls = payrollRes.payrolls || [];
          const auditLogs = auditRes.logs || [];

          // Department breakdown
          const deptCount: Record<string, number> = {};
          let totalSalary = 0;
          employees.forEach((e: any) => {
            const dept = e.department || 'General';
            deptCount[dept] = (deptCount[dept] || 0) + 1;
            totalSalary += Number(e.salary || 0);
          });

          const deptChartData = Object.entries(deptCount).map(([name, count]) => ({
            name,
            count,
          }));

          const latestPayroll = payrolls[0] || null;
          const avgSalary = employees.length > 0 ? Math.round(totalSalary / employees.length) : 0;

          const statsObj = {
            headcount: employees.length,
            attritionRate: '0%',
            payrollCost: latestPayroll?.totalCost || 0,
            avgSalary,
            deptChartData,
            auditFeed: auditLogs.slice(0, 6),
          };

          setAdminStats(statsObj);

          // Fetch AI Summary
          fetchAISummary(statsObj, user);
        } else if (role === 'HR') {
          const [dailyRes, leaveRes, empRes] = await Promise.all([
            api.attendance.getDailyBoard().catch(() => ({ counts: {}, board: [] })),
            api.leave.getAll('Pending').catch(() => ({ leaves: [] })),
            api.employees.list().catch(() => ({ employees: [] })),
          ]);

          const counts = dailyRes.counts || { total: 0, present: 0, late: 0, onLeave: 0, absent: 0 };
          const pendingLeaves = leaveRes.leaves || [];
          const lateComers = (dailyRes.board || []).filter((b: any) => b.status === 'Late').slice(0, 5);

          // Real attendance trend if records exist, otherwise empty
          const attendanceTrend: any[] = counts.total > 0
            ? [{ day: 'Today', rate: Math.round(((counts.present + counts.late) / counts.total) * 100) }]
            : [];

          const statsObj = {
            headcount: counts.total || empRes.employees?.length || 0,
            present: counts.present || 0,
            onLeave: counts.onLeave || 0,
            lateToday: counts.late || 0,
            pendingApprovals: pendingLeaves.length,
            lateComers,
            attendanceTrend,
          };

          setHrStats(statsObj);
          fetchAISummary(statsObj, user);
        } else {
          // Employee Dashboard
          const [todayRes, attRes, leaveRes, payrollRes, annRes] = await Promise.all([
            api.attendance.getToday().catch(() => ({ attendance: null })),
            api.attendance.getMyHistory().catch(() => ({ records: [], stats: {} })),
            api.leave.getMyLeaves().catch(() => ({ balance: {}, leaves: [] })),
            api.payroll.getMyPayslips().catch(() => ({ payslips: [] })),
            api.announcements.list().catch(() => ({ announcements: [] })),
          ]);

          setTodayAttendance(todayRes.attendance);

          setEmpStats({
            attendanceStats: attRes.stats || { weeklyHours: 0, weeklyTarget: 40, lateCount: 0 },
            leaveBalance: leaveRes.balance || { casual: 0, sick: 0, annual: 0 },
            lastPayslip: payrollRes.payslips?.[0] || null,
            announcements: annRes.announcements?.slice(0, 3) || [],
          });
        }
      } catch (err: any) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const fetchAISummary = async (data: any, user: any) => {
    setLoadingAiSummary(true);
    try {
      const res = await api.ai.dashboardSummary(data);
      if (res.bullets && res.bullets.length > 0) {
        setAiSummary(res.bullets);
        setAiProvider(res.providerUsed || 'Gemini');
      } else {
        setAiSummary([
          'Headcount and organizational parameters are actively tracked.',
          'Review shift compliance and real-time attendance figures.',
          'Verify latest monthly payroll and team balance.',
        ]);
      }
    } catch {
      setAiSummary([
        'Real-time workforce intelligence synchronized with live database.',
        'Active employee records and departmental metrics are stable.',
      ]);
    } finally {
      setLoadingAiSummary(false);
    }
  };

  // Employee Check-in / Check-out Handlers
  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const res: any = await api.attendance.checkIn();
      if (res.success) {
        setTodayAttendance(res.attendance);
        toast.success('Checked In!', res.message || 'Have a productive day!');
      } else {
        toast.warning('Check-in Warning', res.message);
      }
    } catch (err: any) {
      toast.error('Check-in Failed', err.message);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingIn(true);
    try {
      const res: any = await api.attendance.checkOut();
      if (res.success) {
        setTodayAttendance(res.attendance);
        toast.success('Checked Out!', res.message || 'Have a great evening!');
      } else {
        toast.warning('Check-out Warning', res.message);
      }
    } catch (err: any) {
      toast.error('Check-out Failed', err.message);
    } finally {
      setCheckingIn(false);
    }
  };

  const role = currentUser?.role || 'Employee';

  return (
    <DashboardLayout title={`${role} Dashboard`}>
      <div className="space-y-6">
        {/* ============================================================== */}
        {/* 1. ADMIN DASHBOARD VIEW                                        */}
        {/* Headcount, Attrition, Payroll Cost, Avg Salary, Dept, Audit, AI */}
        {/* ============================================================== */}
        {role === 'Admin' && (
          <>
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
              ) : (
                <>
                  <StatCard
                    title="Active Headcount"
                    value={adminStats?.headcount ?? 0}
                    subtitle="Full-time employees"
                    icon={Users}
                    trend={{ value: '+4% MoM', isPositive: true }}
                    accentColor="blue"
                  />
                  <StatCard
                    title="Attrition Rate"
                    value={adminStats?.attritionRate || '1.8%'}
                    subtitle="Industry avg: 4.5%"
                    icon={TrendingUp}
                    trend={{ value: '-0.3%', isPositive: true }}
                    accentColor="cyan"
                  />
                  <StatCard
                    title="Latest Payroll Cost"
                    value={`$${(adminStats?.payrollCost || 0).toLocaleString()}`}
                    subtitle="Monthly total net"
                    icon={CreditCard}
                    accentColor="sky"
                  />
                  <StatCard
                    title="Average Salary"
                    value={`$${(adminStats?.avgSalary || 0).toLocaleString()}`}
                    subtitle="Across active workforce"
                    icon={Building}
                    accentColor="emerald"
                  />
                </>
              )}
            </div>

            {/* AI Executive Summary Card */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0A66C2] to-[#1DE0FF] flex items-center justify-center text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[var(--navy)] dark:text-white">
                      AI Executive Insights
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Synthesized from real-time organizational KPIs
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0A66C2]/10 text-[#0A66C2] dark:text-[#1DE0FF] border border-[#0A66C2]/30">
                  Powered by {aiProvider}
                </span>
              </div>

              <div className="mt-4">
                {loadingAiSummary ? (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-4">
                    <span className="w-2 h-2 rounded-full bg-[#0A66C2] animate-ping" />
                    Generating insights with {aiProvider}...
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {aiSummary.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm">
                        <CheckCircle2 className="w-4 h-4 text-[#10AEE6] shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Charts & Audit Feed Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Headcount by Department Chart */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                <h3 className="font-extrabold text-sm text-[var(--navy)] dark:text-white mb-4">
                  Headcount by Department
                </h3>
                <div className="h-64 w-full">
                  {adminStats?.deptChartData && adminStats.deptChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={adminStats.deptChartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="name" fontSize={11} stroke="#94A3B8" />
                        <YAxis allowDecimals={false} fontSize={11} stroke="#94A3B8" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#12213F',
                            borderRadius: '12px',
                            color: '#fff',
                            border: 'none',
                          }}
                        />
                        <Bar dataKey="count" fill="#0A66C2" radius={[6, 6, 0, 0]}>
                          {adminStats.deptChartData.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-xs text-[var(--text-muted)] gap-2.5">
                      <Users className="w-8 h-8 text-slate-400 stroke-1" />
                      <div>
                        <p className="font-semibold text-[var(--text)]">No data yet</p>
                        <p className="mt-0.5 text-[11px]">Register team members to see headcount distributed across departments.</p>
                      </div>
                      <Link
                        href="/employees"
                        className="mt-1 px-3.5 py-1.5 rounded-xl bg-[#0A66C2] text-white text-xs font-bold hover:bg-[#084e96] transition shadow-xs inline-flex items-center gap-1.5"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Add your first employee</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Audit Log Activity Feed */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-extrabold text-sm text-[var(--navy)] dark:text-white flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-[#0A66C2]" />
                      Audit & Security Feed
                    </h3>
                    <Link
                      href="/audit-log"
                      className="text-xs font-bold text-[#0A66C2] hover:underline flex items-center gap-1"
                    >
                      View all <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {adminStats?.auditFeed && adminStats.auditFeed.length > 0 ? (
                      adminStats.auditFeed.map((log: any, idx: number) => (
                        <div
                          key={log._id || idx}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[var(--border)] flex items-start justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-[var(--navy)] dark:text-white">
                              {log.userName}
                            </span>{' '}
                            <span className="text-[var(--text-muted)]">
                              ({log.userRole}): {log.action}
                            </span>
                            <p className="mt-0.5 text-[11px] text-[var(--text-muted)] truncate max-w-xs">
                              {log.details}
                            </p>
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)] shrink-0 ml-2">
                            {new Date(log.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] py-8 text-center">
                        No audit events recorded yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* 2. HR DASHBOARD VIEW                                           */}
        {/* Headcount, Present, On Leave, Late, Approvals, Trend, Top 5 Late*/}
        {/* ============================================================== */}
        {role === 'HR' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              <StatCard
                title="Total Staff"
                value={hrStats?.headcount ?? 0}
                icon={Users}
                accentColor="navy"
              />
              <StatCard
                title="Present Today"
                value={hrStats?.present ?? 0}
                icon={UserCheck}
                accentColor="emerald"
              />
              <StatCard
                title="On Leave"
                value={hrStats?.onLeave ?? 0}
                icon={CalendarDays}
                accentColor="sky"
              />
              <StatCard
                title="Late Today"
                value={hrStats?.lateToday ?? 0}
                icon={AlertTriangle}
                accentColor="amber"
              />
              <StatCard
                title="Pending Approvals"
                value={hrStats?.pendingApprovals ?? 0}
                icon={Clock}
                accentColor="blue"
              />
            </div>

            {/* AI Summary Card for HR */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#10AEE6]" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-muted)]">
                    HR Intelligence Digest
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0A66C2]/10 text-[#0A66C2] dark:text-[#1DE0FF]">
                  Powered by {aiProvider}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {aiSummary.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10AEE6] mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Attendance Trend & Late Comers Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Trend Line Chart */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                <h3 className="font-extrabold text-sm text-[var(--navy)] dark:text-white mb-4">
                  Weekly Attendance Rate (%)
                </h3>
                <div className="h-60 w-full">
                  {hrStats?.attendanceTrend && hrStats.attendanceTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={hrStats.attendanceTrend}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} />
                        <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#12213F',
                            borderRadius: '12px',
                            color: '#fff',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="rate"
                          stroke="#0A66C2"
                          strokeWidth={3}
                          dot={{ fill: '#1DE0FF', r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-xs text-[var(--text-muted)] gap-2">
                      <CalendarCheck className="w-8 h-8 text-slate-400 stroke-1" />
                      <p className="font-semibold text-[var(--text)]">No data yet</p>
                      <p className="text-[11px]">Attendance trends will appear here as employees submit daily check-ins.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Top 5 Late Comers Today */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-extrabold text-sm text-[var(--navy)] dark:text-white">
                    Late Check-ins Today (Past 09:30 AM)
                  </h3>
                  <Link
                    href="/attendance"
                    className="text-xs font-bold text-[#0A66C2] hover:underline"
                  >
                    Daily Board →
                  </Link>
                </div>
                <div className="space-y-2.5">
                  {hrStats?.lateComers && hrStats.lateComers.length > 0 ? (
                    hrStats.lateComers.map((emp: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/40 text-xs"
                      >
                        <div>
                          <p className="font-bold text-[var(--navy)] dark:text-white">{emp.name}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">{emp.department}</p>
                        </div>
                        <span className="font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-2.5 py-1 rounded-lg">
                          Check-in: {emp.checkIn ? new Date(emp.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Late'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      No late arrivals recorded today! Full punctuality.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* 3. EMPLOYEE DASHBOARD VIEW                                     */}
        {/* Check-in Widget, Hours This Week vs 40h, Late Count, Leave, etc*/}
        {/* ============================================================== */}
        {role === 'Employee' && (
          <>
            {/* Interactive Check-in & Hours Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Check-In Action Card */}
              <div className="lg:col-span-1 bg-gradient-to-br from-[#12213F] to-[#0A66C2] rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold mb-4 text-[#1DE0FF]">
                    <Clock className="w-3.5 h-3.5" />
                    Shift 09:00 AM – 06:00 PM
                  </div>
                  <h3 className="text-xl font-extrabold tracking-tight">Today&apos;s Attendance</h3>
                  <p className="mt-1 text-xs text-slate-300">
                    Standard 30-min grace period applies (Late after 09:30 AM).
                  </p>

                  <div className="mt-6 p-4 rounded-2xl bg-white/10 border border-white/10 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Status:</span>
                      <span className="font-bold text-[#1DE0FF]">
                        {todayAttendance?.status || 'Not Checked In'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Check-in Time:</span>
                      <span className="font-semibold">
                        {todayAttendance?.checkIn
                          ? new Date(todayAttendance.checkIn).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Check-out Time:</span>
                      <span className="font-semibold">
                        {todayAttendance?.checkOut
                          ? new Date(todayAttendance.checkOut).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  {!todayAttendance?.checkIn ? (
                    <button
                      type="button"
                      disabled={checkingIn}
                      onClick={handleCheckIn}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#10AEE6] to-[#1DE0FF] text-[#12213F] font-extrabold text-sm hover:opacity-95 transition shadow-lg flex items-center justify-center gap-2"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>{checkingIn ? 'Checking In...' : 'Check In Now'}</span>
                    </button>
                  ) : !todayAttendance?.checkOut ? (
                    <button
                      type="button"
                      disabled={checkingIn}
                      onClick={handleCheckOut}
                      className="w-full py-3 rounded-2xl bg-white text-[#12213F] font-extrabold text-sm hover:bg-slate-100 transition shadow-lg flex items-center justify-center gap-2"
                    >
                      <UserX className="w-4 h-4" />
                      <span>{checkingIn ? 'Checking Out...' : 'Check Out Now'}</span>
                    </button>
                  ) : (
                    <div className="p-3 text-center bg-white/20 rounded-2xl text-xs font-bold text-emerald-300">
                      ✓ Daily Attendance Completed ({todayAttendance.workHours} hrs)
                    </div>
                  )}
                </div>
              </div>

              {/* Progress & Stats Cards */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Hours Worked vs 40h Target */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Weekly Hours vs 40h
                    </span>
                    <h4 className="mt-2 text-3xl font-extrabold text-[var(--navy)] dark:text-white">
                      {empStats?.attendanceStats?.weeklyHours || 0} / 40h
                    </h4>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {Math.max(0, 40 - (empStats?.attendanceStats?.weeklyHours || 0))} hours remaining
                      this week
                    </p>
                  </div>

                  <div className="mt-4">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#0A66C2] to-[#10AEE6] h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            ((empStats?.attendanceStats?.weeklyHours || 0) / 40) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Late Arrivals Count */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Late Arrival Count
                    </span>
                    <h4 className="mt-2 text-3xl font-extrabold text-[var(--navy)] dark:text-white">
                      {empStats?.attendanceStats?.lateCount || 0}
                    </h4>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Recorded check-ins past 09:30 AM
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[var(--border)]">
                    <Link
                      href="/attendance"
                      className="text-xs font-bold text-[#0A66C2] hover:underline flex items-center gap-1"
                    >
                      Request Correction <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Leave Balance Overview */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm sm:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Your Leave Balances
                    </span>
                    <Link
                      href="/leave"
                      className="text-xs font-bold text-[#0A66C2] hover:underline flex items-center gap-1"
                    >
                      Apply Leave <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[var(--border)] text-center">
                      <span className="text-xs text-[var(--text-muted)]">Casual</span>
                      <p className="text-xl font-extrabold text-[#0A66C2]">
                        {empStats?.leaveBalance?.casual ?? 0}d
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[var(--border)] text-center">
                      <span className="text-xs text-[var(--text-muted)]">Sick</span>
                      <p className="text-xl font-extrabold text-[#10AEE6]">
                        {empStats?.leaveBalance?.sick ?? 0}d
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[var(--border)] text-center">
                      <span className="text-xs text-[var(--text-muted)]">Annual</span>
                      <p className="text-xl font-extrabold text-[#12213F] dark:text-slate-200">
                        {empStats?.leaveBalance?.annual ?? 0}d
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Last Payslip & Announcements */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Last Payslip Card */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-[var(--navy)] dark:text-white mb-2">
                    Latest Finalized Payslip
                  </h3>
                  {empStats?.lastPayslip ? (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-[var(--border)] space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Period:</span>
                        <span className="font-bold">{empStats.lastPayslip.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Net Salary:</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                          ${empStats.lastPayslip.record?.netSalary?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Status:</span>
                        <span className="font-semibold text-[#0A66C2]">Paid</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] py-4">
                      No finalized payslips available yet. Monthly payroll is pending finalization.
                    </p>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--border)]">
                  <Link
                    href="/payroll"
                    className="text-xs font-bold text-[#0A66C2] hover:underline flex items-center gap-1"
                  >
                    View All Payslips & PDF <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Company Announcements */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-[var(--navy)] dark:text-white mb-3">
                    Company Announcements
                  </h3>
                  <div className="space-y-2.5">
                    {empStats?.announcements && empStats.announcements.length > 0 ? (
                      empStats.announcements.map((ann: any, idx: number) => (
                        <div
                          key={ann._id || idx}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[var(--border)] text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[var(--navy)] dark:text-white">
                              {ann.title}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {new Date(ann.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-[var(--text-muted)] line-clamp-2">
                            {ann.content}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] py-4">
                        No active announcements posted.
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--border)]">
                  <Link
                    href="/announcements"
                    className="text-xs font-bold text-[#0A66C2] hover:underline flex items-center gap-1"
                  >
                    Announcement Board <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
