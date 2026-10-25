import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Upload,
  FileSpreadsheet,
  Eye,
  CheckCircle2,
  AlertCircle,
  Building,
  Briefcase,
  DollarSign,
  Phone,
  Mail,
  Shield,
  Edit2,
  Trash2,
} from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { DataTable, Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { api, getStoredUser } from '../../lib/api';

export default function EmployeesPage() {
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Employee 360 State
  const [selected360, setSelected360] = useState<any>(null);
  const [modal360Open, setModal360Open] = useState(false);
  const [loading360, setLoading360] = useState(false);

  // Create / Edit Modal State
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Employee',
    department: 'Engineering',
    designation: 'Associate',
    salary: 60000,
    phone: '',
    status: 'Active',
  });

  // CSV Import State
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvDryRunResult, setCsvDryRunResult] = useState<any>(null);
  const [csvProcessing, setCsvProcessing] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res: any = await api.employees.list();
      setEmployees(res.employees || []);
    } catch (err: any) {
      toast.error('Failed to load employees', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentUser(getStoredUser());
    fetchEmployees();
  }, []);

  // Open Employee 360
  const handleOpen360 = async (emp: any) => {
    setLoading360(true);
    setModal360Open(true);
    try {
      const res: any = await api.employees.get360(emp.id || emp._id);
      setSelected360(res);
    } catch (err: any) {
      toast.error('Error fetching Employee 360', err.message);
    } finally {
      setLoading360(false);
    }
  };

  // Open Create/Edit Form
  const handleOpenCreate = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      email: '',
      role: 'Employee',
      department: 'Engineering',
      designation: 'Staff Associate',
      salary: 60000,
      phone: '',
      status: 'Active',
    });
    setFormModalOpen(true);
  };

  const handleOpenEdit = (emp: any) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name || '',
      email: emp.email || '',
      role: emp.role || 'Employee',
      department: emp.department || 'General',
      designation: emp.designation || 'Staff',
      salary: emp.salary || 60000,
      phone: emp.phone || '',
      status: emp.status || 'Active',
    });
    setFormModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      if (editingEmployee) {
        await api.employees.update(editingEmployee.id || editingEmployee._id, formData);
        toast.success('Employee Updated', `${formData.name} was updated successfully.`);
      } else {
        await api.employees.create(formData);
        toast.success('Employee Created', `${formData.name} was added to the directory.`);
      }
      setFormModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      toast.error('Action Failed', err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // CSV Dry Run Handler
  const handleDryRunCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      toast.warning('No file selected', 'Please choose a CSV file first.');
      return;
    }

    setCsvProcessing(true);
    try {
      const form = new FormData();
      form.append('file', csvFile);
      const res: any = await api.employees.dryRunCSV(form);
      setCsvDryRunResult(res);
      toast.info('Dry Run Completed', `Validated ${res.totalRows} rows: ${res.validCount} valid, ${res.invalidCount} invalid.`);
    } catch (err: any) {
      toast.error('CSV Dry-run Failed', err.message);
    } finally {
      setCsvProcessing(false);
    }
  };

  // CSV Commit Handler
  const handleCommitCSV = async () => {
    if (!csvDryRunResult || !csvDryRunResult.validRows?.length) return;

    setCsvProcessing(true);
    try {
      const res: any = await api.employees.commitCSV(csvDryRunResult.validRows);
      toast.success('Import Successful!', res.message || `Imported ${res.count} employees.`);
      setCsvModalOpen(false);
      setCsvDryRunResult(null);
      setCsvFile(null);
      fetchEmployees();
    } catch (err: any) {
      toast.error('Import Commit Failed', err.message);
    } finally {
      setCsvProcessing(false);
    }
  };

  const isPrivileged = currentUser?.role === 'Admin' || currentUser?.role === 'HR';

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Employee',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0A66C2] to-[#10AEE6] flex items-center justify-center font-bold text-xs text-white shrink-0">
            {row.name
              ?.split(' ')
              .map((n: string) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-[var(--navy)] dark:text-white">{row.name}</div>
            <div className="text-xs text-[var(--text-muted)]">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'employeeId',
      header: 'Employee ID',
      sortable: true,
      render: (row) => <span className="font-mono text-xs">{row.employeeId || '—'}</span>,
    },
    {
      key: 'department',
      header: 'Department',
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-[var(--text)]">
          {row.department || 'General'}
        </span>
      ),
    },
    {
      key: 'designation',
      header: 'Designation',
      render: (row) => row.designation || 'Staff',
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (row) => (
        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
            row.role === 'Admin'
              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
              : row.role === 'HR'
              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {row.role}
        </span>
      ),
    },
    {
      key: 'salary',
      header: 'Salary',
      render: (row) => (row.salary !== undefined ? `$${row.salary.toLocaleString()}` : '—'),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
            row.status === 'Active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              row.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
            }`}
          />
          {row.status || 'Active'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleOpen360(row)}
            className="p-1.5 rounded-lg text-[#0A66C2] hover:bg-[#0A66C2]/10 transition"
            title="View Employee 360"
          >
            <Eye className="w-4 h-4" />
          </button>
          {isPrivileged && (
            <button
              type="button"
              onClick={() => handleOpenEdit(row)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-[var(--text)] hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Edit Employee"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Employee Management">
      <div className="space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-[var(--navy)] dark:text-white tracking-tight">
              Employee Directory
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Manage organization members, Employee 360 profiles, and bulk CSV onboarding.
            </p>
          </div>

          {isPrivileged && (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setCsvDryRunResult(null);
                  setCsvFile(null);
                  setCsvModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-slate-50 dark:hover:bg-slate-800 text-[var(--text)] transition shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#10AEE6]" />
                <span>Import CSV (Dry-Run)</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#0A66C2] to-[#10AEE6] text-white hover:opacity-95 transition shadow-sm shadow-[#0A66C2]/20"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Employee</span>
              </button>
            </div>
          )}
        </div>

        {/* Directory DataTable */}
        <DataTable
          columns={columns}
          data={employees}
          searchKey="name"
          searchPlaceholder="Search employees by name, email, or ID..."
          filters={[
            {
              key: 'department',
              label: 'Dept',
              options: [
                { label: 'Engineering', value: 'Engineering' },
                { label: 'Marketing', value: 'Marketing' },
                { label: 'Sales', value: 'Sales' },
                { label: 'Product Design', value: 'Product Design' },
                { label: 'Human Resources', value: 'Human Resources' },
                { label: 'Finance', value: 'Finance' },
              ],
            },
            {
              key: 'role',
              label: 'Role',
              options: [
                { label: 'Admin', value: 'Admin' },
                { label: 'HR', value: 'HR' },
                { label: 'Employee', value: 'Employee' },
              ],
            },
          ]}
        />

        {/* ================= EMPLOYEE 360 MODAL ================= */}
        <Modal
          isOpen={modal360Open}
          onClose={() => setModal360Open(false)}
          title="Employee 360 Overview"
          description="Holistic performance, attendance records, leave requests, and payroll summary."
          maxWidth="2xl"
        >
          {loading360 ? (
            <div className="py-12 text-center text-xs text-[var(--text-muted)]">
              <div className="w-8 h-8 border-3 border-[#0A66C2] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading complete 360 profile...
            </div>
          ) : selected360 ? (
            <div className="space-y-5 text-xs sm:text-sm">
              {/* Profile Card Header */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#12213F] to-[#0A66C2] text-white flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 text-white flex items-center justify-center font-extrabold text-lg shrink-0">
                  {selected360.employee?.name
                    ?.split(' ')
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div>
                  <h4 className="text-lg font-bold">{selected360.employee?.name}</h4>
                  <p className="text-xs text-slate-200">
                    {selected360.employee?.designation} • {selected360.employee?.department}
                  </p>
                  <p className="text-[11px] text-[#1DE0FF] font-mono mt-0.5">
                    {selected360.employee?.employeeId} • {selected360.employee?.email}
                  </p>
                </div>
              </div>

              {/* 360 Metric Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[var(--border)] text-center">
                  <span className="text-[11px] text-[var(--text-muted)]">Present Days</span>
                  <p className="text-xl font-extrabold text-emerald-600">
                    {selected360.stats?.presentCount || 0}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[var(--border)] text-center">
                  <span className="text-[11px] text-[var(--text-muted)]">Late Days</span>
                  <p className="text-xl font-extrabold text-amber-600">
                    {selected360.stats?.lateCount || 0}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[var(--border)] text-center">
                  <span className="text-[11px] text-[var(--text-muted)]">Work Hours</span>
                  <p className="text-xl font-extrabold text-[#0A66C2]">
                    {selected360.stats?.totalWorkHours || 0}h
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[var(--border)] text-center">
                  <span className="text-[11px] text-[var(--text-muted)]">Approved Leaves</span>
                  <p className="text-xl font-extrabold text-[#10AEE6]">
                    {selected360.stats?.approvedLeaves || 0}
                  </p>
                </div>
              </div>

              {/* Leave Balances */}
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/50">
                <h5 className="font-bold text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">
                  Remaining Leave Quota
                </h5>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-[var(--card)] rounded-lg border border-[var(--border)]">
                    <span className="text-[var(--text-muted)]">Casual:</span>{' '}
                    <strong className="text-[#0A66C2]">
                      {selected360.employee?.leaveBalance?.casual ?? 10}d
                    </strong>
                  </div>
                  <div className="p-2 bg-[var(--card)] rounded-lg border border-[var(--border)]">
                    <span className="text-[var(--text-muted)]">Sick:</span>{' '}
                    <strong className="text-[#10AEE6]">
                      {selected360.employee?.leaveBalance?.sick ?? 10}d
                    </strong>
                  </div>
                  <div className="p-2 bg-[var(--card)] rounded-lg border border-[var(--border)]">
                    <span className="text-[var(--text-muted)]">Annual:</span>{' '}
                    <strong className="text-[#12213F] dark:text-slate-200">
                      {selected360.employee?.leaveBalance?.annual ?? 14}d
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </Modal>

        {/* ================= CREATE / EDIT EMPLOYEE MODAL ================= */}
        <Modal
          isOpen={formModalOpen}
          onClose={() => setFormModalOpen(false)}
          title={editingEmployee ? 'Edit Employee Profile' : 'Add New Employee'}
          description="Configure personal details, organizational role, and compensation."
        >
          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A66C2] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                disabled={!!editingEmployee}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A66C2] disabled:opacity-50 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A66C2] transition"
                >
                  <option value="Employee">Employee</option>
                  <option value="HR">HR Specialist</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Department
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A66C2] transition"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="Product Design">Product Design</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A66C2] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Monthly Base Salary ($)
                </label>
                <input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A66C2] transition"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSubmitting}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#0A66C2] to-[#10AEE6] text-white hover:opacity-95 transition"
              >
                {formSubmitting ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Add Employee'}
              </button>
            </div>
          </form>
        </Modal>

        {/* ================= CSV IMPORT & DRY-RUN MODAL ================= */}
        <Modal
          isOpen={csvModalOpen}
          onClose={() => setCsvModalOpen(false)}
          title="CSV Employee Import with Dry-Run"
          description="Upload a CSV with columns: name, email, department, designation, role, salary. Preview validation errors before committing."
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* File Upload Section */}
            <form onSubmit={handleDryRunCSV} className="space-y-3">
              <div className="border-2 border-dashed border-[var(--border)] rounded-2xl p-6 text-center hover:border-[#0A66C2] transition bg-slate-50/50 dark:bg-slate-900/50">
                <Upload className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                <input
                  type="file"
                  id="csv-file-input"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setCsvFile(e.target.files[0]);
                  }}
                  className="hidden"
                />
                <label
                  htmlFor="csv-file-input"
                  className="cursor-pointer text-xs font-bold text-[#0A66C2] hover:underline"
                >
                  {csvFile ? csvFile.name : 'Click to select CSV file'}
                </label>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Expected header: name, email, department, designation, role, salary
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={!csvFile || csvProcessing}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#0A66C2] text-white hover:bg-[#084e96] disabled:opacity-50 transition"
                >
                  {csvProcessing ? 'Validating CSV...' : 'Run Dry-Run Validation'}
                </button>
              </div>
            </form>

            {/* Dry Run Results Preview */}
            {csvDryRunResult && (
              <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-[var(--border)]">
                    <span className="text-[var(--text-muted)]">Total Evaluated:</span>{' '}
                    <strong>{csvDryRunResult.totalRows}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                    <span>Valid Rows:</span> <strong>{csvDryRunResult.validCount}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-500/30 text-red-700 dark:text-red-300">
                    <span>Invalid Rows:</span> <strong>{csvDryRunResult.invalidCount}</strong>
                  </div>
                </div>

                {/* Validation Errors Table */}
                {csvDryRunResult.invalidRows?.length > 0 && (
                  <div className="p-3 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 max-h-40 overflow-y-auto text-xs space-y-1.5">
                    <div className="font-bold text-red-800 dark:text-red-300">Row Errors:</div>
                    {csvDryRunResult.invalidRows.map((inv: any, idx: number) => (
                      <div key={idx} className="text-red-700 dark:text-red-400">
                        • Row {inv.rowNumber} ({inv.data?.email || 'No email'}): {inv.errors.join(', ')}
                      </div>
                    ))}
                  </div>
                )}

                {/* Commit Button */}
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-[var(--text-muted)]">
                    Ready to commit {csvDryRunResult.validCount} valid record(s).
                  </span>
                  <button
                    type="button"
                    onClick={handleCommitCSV}
                    disabled={csvDryRunResult.validCount === 0 || csvProcessing}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
                  >
                    Commit & Import to Database
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
