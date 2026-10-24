'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  CreditCard,
  Plus,
  Lock,
  Printer,
  Eye,
  CheckCircle2,
  Calendar,
  Building,
  DollarSign,
  Download,
  AlertCircle,
} from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { DataTable, Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { api, getStoredUser } from '../../lib/api';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PayrollPage() {
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'payroll-runs' | 'my-payslips'>('payroll-runs');

  // Management State
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
  const [payrollDetailsModal, setPayrollDetailsModal] = useState(false);

  // Generate Draft Modal
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftMonth, setDraftMonth] = useState(1);
  const [draftYear, setDraftYear] = useState(2026);
  const [generating, setGenerating] = useState(false);

  // My Payslips State (Employee)
  const [myPayslips, setMyPayslips] = useState<any[]>([]);

  // Payslip Printable Modal State
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  const [selectedPayslipData, setSelectedPayslipData] = useState<any>(null);

  const fetchPayrolls = async () => {
    try {
      const res: any = await api.payroll.list();
      setPayrolls(res.payrolls || []);
    } catch (err: any) {
      console.error('Error loading payroll runs:', err);
    }
  };

  const fetchMyPayslips = async () => {
    try {
      const res: any = await api.payroll.getMyPayslips();
      setMyPayslips(res.payslips || []);
    } catch (err: any) {
      console.error('Error loading my payslips:', err);
    }
  };

  useEffect(() => {
    const now = new Date();
    setDraftMonth(now.getMonth() + 1);
    setDraftYear(now.getFullYear());

    const user = getStoredUser();
    setCurrentUser(user);
    if (user?.role === 'Employee') {
      setActiveTab('my-payslips');
    }
    if (user?.role === 'Admin' || user?.role === 'HR') {
      fetchPayrolls();
    }
    fetchMyPayslips();
  }, []);

  // Generate Draft
  const handleGenerateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res: any = await api.payroll.generateDraft(Number(draftMonth), Number(draftYear));
      toast.success('Draft Generated!', res.message || 'Review employees and finalize when ready.');
      setDraftModalOpen(false);
      fetchPayrolls();
    } catch (err: any) {
      toast.error('Draft Generation Failed', err.message);
    } finally {
      setGenerating(false);
    }
  };

  // View Details of a Payroll Run
  const handleViewPayrollDetails = async (id: string) => {
    try {
      const res: any = await api.payroll.getById(id);
      setSelectedPayroll(res.payroll);
      setPayrollDetailsModal(true);
    } catch (err: any) {
      toast.error('Error fetching payroll details', err.message);
    }
  };

  // Finalize Payroll
  const handleFinalize = async (id: string) => {
    if (!confirm('Are you sure you want to finalize this payroll run? This will lock calculations and publish official payslips to all employees.')) {
      return;
    }
    try {
      const res: any = await api.payroll.finalize(id);
      toast.success('Payroll Finalized!', res.message || 'Payslips are now available in employee portals.');
      setPayrollDetailsModal(false);
      fetchPayrolls();
      fetchMyPayslips();
    } catch (err: any) {
      toast.error('Finalization Failed', err.message);
    }
  };

  // Open Printable Payslip View
  const handleOpenPayslip = async (payrollId: string, userId: string) => {
    try {
      const res: any = await api.payroll.getPayslipDetails(payrollId, userId);
      setSelectedPayslipData(res.payslip);
      setPayslipModalOpen(true);
    } catch (err: any) {
      toast.error('Error loading payslip', err.message);
    }
  };

  const isPrivileged = currentUser?.role === 'Admin' || currentUser?.role === 'HR';
  const isAdmin = currentUser?.role === 'Admin';

  const payrollColumns: Column<any>[] = [
    {
      key: 'title',
      header: 'Payroll Period',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-bold text-[var(--navy)] dark:text-white">{row.title}</span>
          <div className="text-[11px] text-[var(--text-muted)] font-mono">
            {row.monthName} {row.year}
          </div>
        </div>
      ),
    },
    {
      key: 'totalEmployees',
      header: 'Employees',
      render: (row) => `${row.totalEmployees || 0} staff`,
    },
    {
      key: 'totalCost',
      header: 'Total Net Cost',
      sortable: true,
      render: (row) => (
        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
          ${(row.totalCost || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <span
          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
            row.status === 'Finalized'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      render: (row) => (
        <button
          type="button"
          onClick={() => handleViewPayrollDetails(row.id || row._id)}
          className="px-3 py-1 text-xs font-bold rounded-lg border border-[var(--border)] hover:bg-[#0A66C2] hover:text-white transition"
        >
          Review Run
        </button>
      ),
    },
  ];

  const myPayslipColumns: Column<any>[] = [
    {
      key: 'title',
      header: 'Pay Period',
      render: (row) => (
        <div>
          <span className="font-bold text-[var(--navy)] dark:text-white">{row.title}</span>
          <div className="text-[11px] text-[var(--text-muted)] font-mono">
            {row.monthName} {row.year}
          </div>
        </div>
      ),
    },
    {
      key: 'basicSalary',
      header: 'Basic Salary',
      render: (row) => `$${(row.record?.basicSalary || 0).toLocaleString()}`,
    },
    {
      key: 'allowances',
      header: 'Allowances',
      render: (row) => `+$${(row.record?.allowances?.total || 0).toLocaleString()}`,
    },
    {
      key: 'deductions',
      header: 'Deductions',
      render: (row) => `-$${(row.record?.deductions?.total || 0).toLocaleString()}`,
    },
    {
      key: 'netSalary',
      header: 'Net Pay',
      render: (row) => (
        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
          ${(row.record?.netSalary || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Payslip',
      render: (row) => (
        <button
          type="button"
          onClick={() => handleOpenPayslip(row.payrollId, row.record?.user)}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-[#0A66C2] text-white hover:bg-[#084e96] transition shadow-xs"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>View / Print PDF</span>
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout title="Payroll Lite & Compensation">
      <div className="space-y-6">
        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
            {isPrivileged && (
              <button
                type="button"
                onClick={() => setActiveTab('payroll-runs')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  activeTab === 'payroll-runs'
                    ? 'bg-[var(--card)] text-[var(--navy)] dark:text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                Payroll Runs
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('my-payslips')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === 'my-payslips'
                  ? 'bg-[var(--card)] text-[var(--navy)] dark:text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              My Payslips
            </button>
          </div>

          {isPrivileged && (
            <button
              type="button"
              onClick={() => setDraftModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#0A66C2] via-[#10AEE6] to-[#1DE0FF] text-white hover:opacity-95 transition shadow-sm shadow-[#0A66C2]/20"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Monthly Draft</span>
            </button>
          )}
        </div>

        {/* ================= 1. PAYROLL RUNS TAB ================= */}
        {activeTab === 'payroll-runs' && isPrivileged && (
          <div className="space-y-4">
            <DataTable
              columns={payrollColumns}
              data={payrolls}
              searchKey="title"
              searchPlaceholder="Search payroll periods..."
              emptyTitle="No payroll runs generated yet"
              emptyDescription="Click 'Generate Monthly Draft' to calculate compensation for active staff."
            />
          </div>
        )}

        {/* ================= 2. MY PAYSLIPS TAB ================= */}
        {activeTab === 'my-payslips' && (
          <div className="space-y-4">
            <DataTable
              columns={myPayslipColumns}
              data={myPayslips}
              searchKey="title"
              searchPlaceholder="Search by month/year..."
              emptyTitle="No finalized payslips available"
              emptyDescription="Official payslips become downloadable once finalized by the Administrator."
            />
          </div>
        )}

        {/* ================= GENERATE DRAFT MODAL ================= */}
        <Modal
          isOpen={draftModalOpen}
          onClose={() => setDraftModalOpen(false)}
          title="Generate Monthly Payroll Draft"
          description="Calculates basic salary, housing, transport, medical allowances, and tax withholdings for all active employees."
        >
          <form onSubmit={handleGenerateDraft} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">Month</label>
                <select
                  value={draftMonth}
                  onChange={(e) => setDraftMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none"
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">Year</label>
                <input
                  type="number"
                  value={draftYear}
                  onChange={(e) => setDraftYear(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs text-[var(--text-muted)] space-y-1">
              <p>• Housing Allowance: 15%</p>
              <p>• Transport Allowance: 10%</p>
              <p>• Medical Allowance: 5%</p>
              <p>• Income Tax Withholding: 5%</p>
              <p>• Insurance: 2%</p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setDraftModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={generating}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#0A66C2] text-white hover:bg-[#084e96] disabled:opacity-50 transition"
              >
                {generating ? 'Calculating...' : 'Generate Calculations'}
              </button>
            </div>
          </form>
        </Modal>

        {/* ================= REVIEW PAYROLL RUN MODAL ================= */}
        <Modal
          isOpen={payrollDetailsModal}
          onClose={() => setPayrollDetailsModal(false)}
          title={selectedPayroll ? selectedPayroll.title : 'Payroll Run Details'}
          description="Examine employee earnings breakdown before final administrative lock."
          maxWidth="4xl"
        >
          {selectedPayroll && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-[var(--border)] text-xs">
                <div>
                  <span className="text-[var(--text-muted)]">Status:</span>{' '}
                  <strong className={selectedPayroll.status === 'Finalized' ? 'text-emerald-600' : 'text-amber-600'}>
                    {selectedPayroll.status}
                  </strong>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Employees:</span>{' '}
                  <strong>{selectedPayroll.totalEmployees}</strong>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Total Net Payroll:</span>{' '}
                  <strong className="text-emerald-600 text-sm">
                    ${(selectedPayroll.totalCost || 0).toLocaleString()}
                  </strong>
                </div>
              </div>

              {/* Records Table */}
              <div className="max-h-72 overflow-y-auto border border-[var(--border)] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-[var(--text-muted)] font-bold border-b border-[var(--border)] sticky top-0">
                    <tr>
                      <th className="p-2.5">Employee</th>
                      <th className="p-2.5">Basic</th>
                      <th className="p-2.5">Allowances</th>
                      <th className="p-2.5">Deductions</th>
                      <th className="p-2.5">Net Pay</th>
                      <th className="p-2.5">Payslip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {selectedPayroll.records?.map((rec: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <td className="p-2.5 font-bold">
                          {rec.name}
                          <div className="text-[10px] font-normal text-[var(--text-muted)]">
                            {rec.department}
                          </div>
                        </td>
                        <td className="p-2.5">${(rec.basicSalary || 0).toLocaleString()}</td>
                        <td className="p-2.5 text-emerald-600">+${(rec.allowances?.total || 0).toLocaleString()}</td>
                        <td className="p-2.5 text-red-500">-${(rec.deductions?.total || 0).toLocaleString()}</td>
                        <td className="p-2.5 font-extrabold text-[#0A66C2]">
                          ${(rec.netSalary || 0).toLocaleString()}
                        </td>
                        <td className="p-2.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenPayslip(selectedPayroll._id || selectedPayroll.id, rec.user)
                            }
                            className="p-1 rounded text-[#0A66C2] hover:bg-[#0A66C2]/10"
                            title="Print Payslip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setPayrollDetailsModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)]"
                >
                  Close
                </button>

                {isAdmin && selectedPayroll.status === 'Draft' && (
                  <button
                    type="button"
                    onClick={() => handleFinalize(selectedPayroll._id || selectedPayroll.id)}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Finalize & Lock Payroll</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* ================= PRINTABLE PAYSLIP MODAL ================= */}
        <Modal
          isOpen={payslipModalOpen}
          onClose={() => setPayslipModalOpen(false)}
          title="Print Official Payslip"
          maxWidth="2xl"
        >
          {selectedPayslipData && (
            <div className="space-y-6">
              {/* Printable Document Box */}
              <div
                id="printable-payslip"
                className="p-8 bg-white text-slate-900 border-2 border-slate-200 rounded-2xl shadow-sm space-y-6 print:border-none print:shadow-none print:p-0"
              >
                {/* Header with Logo */}
                <div className="flex items-center justify-between pb-4 border-b-2 border-[#12213F]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 relative shrink-0">
                      <Image
                        src="/logo.png"
                        alt="MetaGlide Marketing"
                        width={48}
                        height={48}
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold tracking-tight text-[#12213F]">
                        {selectedPayslipData.company?.name || 'MetaGlide Marketing'}
                      </h2>
                      <p className="text-xs font-semibold text-[#0A66C2]">
                        {selectedPayslipData.company?.tagline || 'Effortless Digital Growth'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {selectedPayslipData.company?.address || 'Digital Growth Plaza, Suite 400'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                      Official Payslip
                    </span>
                    <p className="text-xs font-extrabold mt-1 text-[#12213F]">
                      {selectedPayslipData.period?.title}
                    </p>
                  </div>
                </div>

                {/* Employee Details Grid */}
                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl text-xs">
                  <div>
                    <p className="text-slate-500">Employee Name:</p>
                    <p className="font-bold text-sm text-[#12213F]">{selectedPayslipData.employee?.name}</p>
                    <p className="text-slate-500 mt-1">Designation:</p>
                    <p className="font-semibold">{selectedPayslipData.employee?.designation}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Employee ID:</p>
                    <p className="font-mono font-bold text-sm text-[#12213F]">{selectedPayslipData.employee?.id}</p>
                    <p className="text-slate-500 mt-1">Department:</p>
                    <p className="font-semibold">{selectedPayslipData.employee?.department}</p>
                  </div>
                </div>

                {/* Earnings & Deductions Tables */}
                <div className="grid grid-cols-2 gap-6 text-xs">
                  {/* Earnings */}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#0A66C2] pb-1.5 border-b border-slate-200">
                      Earnings
                    </h4>
                    <div className="mt-2 space-y-1.5">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600">Basic Salary</span>
                        <span className="font-semibold">
                          ${(selectedPayslipData.earnings?.basicSalary || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600">Housing Allowance (15%)</span>
                        <span className="font-semibold">
                          ${(selectedPayslipData.earnings?.housingAllowance || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600">Transport Allowance (10%)</span>
                        <span className="font-semibold">
                          ${(selectedPayslipData.earnings?.transportAllowance || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600">Medical Allowance (5%)</span>
                        <span className="font-semibold">
                          ${(selectedPayslipData.earnings?.medicalAllowance || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 font-bold text-[#12213F]">
                        <span>Total Earnings</span>
                        <span>${(selectedPayslipData.earnings?.totalEarnings || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-red-600 pb-1.5 border-b border-slate-200">
                      Deductions
                    </h4>
                    <div className="mt-2 space-y-1.5">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600">Income Tax (5%)</span>
                        <span className="font-semibold text-red-600">
                          -${(selectedPayslipData.deductions?.tax || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600">Health Insurance (2%)</span>
                        <span className="font-semibold text-red-600">
                          -${(selectedPayslipData.deductions?.insurance || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 font-bold text-red-700">
                        <span>Total Deductions</span>
                        <span>-${(selectedPayslipData.deductions?.totalDeductions || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Pay Banner */}
                <div className="p-4 bg-gradient-to-r from-[#12213F] to-[#0A66C2] text-white rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Net Take-Home Pay
                    </p>
                    <p className="text-[11px] text-slate-300">Direct Deposit / Bank Transfer</p>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-[#1DE0FF]">
                    ${(selectedPayslipData.netPay || 0).toLocaleString()}
                  </div>
                </div>

                {/* Footer Note */}
                <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-500 text-center">
                  This is a computer-generated payslip authorized by MetaGlide Marketing Human Capital Management.
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayslipModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-[#0A66C2] text-white hover:bg-[#084e96] transition shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save as PDF</span>
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
