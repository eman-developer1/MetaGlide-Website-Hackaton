'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, Filter, Download } from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { DataTable, Column } from '../../components/DataTable';
import { useToast } from '../../components/Toast';
import { api } from '../../lib/api';

export default function AuditLogPage() {
  const toast = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res: any = await api.audit.list();
      setLogs(res.logs || []);
    } catch (err: any) {
      toast.error('Failed to load audit logs', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const columns: Column<any>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-[var(--text-muted)]">
          {new Date(row.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'userName',
      header: 'Actor',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-bold text-[var(--navy)] dark:text-white">{row.userName}</span>
          <span className="ml-1.5 text-[10px] font-semibold text-[var(--text-muted)]">
            ({row.userRole})
          </span>
        </div>
      ),
    },
    {
      key: 'module',
      header: 'Module',
      sortable: true,
      render: (row) => (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-[var(--text)]">
          {row.module}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-[#0A66C2] dark:text-[#1DE0FF]">
          {row.action}
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Event Details',
      render: (row) => (
        <span className="text-xs text-[var(--text-muted)] truncate max-w-sm block">
          {row.details}
        </span>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      render: (row) => <span className="font-mono text-xs text-slate-400">{row.ipAddress || '127.0.0.1'}</span>,
    },
  ];

  return (
    <DashboardLayout title="Audit Log & Compliance Trail">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--navy)] dark:text-white tracking-tight">
            Security & Audit Activity Trail
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Immutable log of user logins, role actions, leave decisions, and compensation calculations.
          </p>
        </div>

        <DataTable
          columns={columns}
          data={logs}
          searchKey="action"
          searchPlaceholder="Search audit events by action..."
          filters={[
            {
              key: 'module',
              label: 'Module',
              options: [
                { label: 'Auth', value: 'Auth' },
                { label: 'Employee', value: 'Employee' },
                { label: 'Attendance', value: 'Attendance' },
                { label: 'Leave', value: 'Leave' },
                { label: 'Payroll', value: 'Payroll' },
                { label: 'Settings', value: 'Settings' },
                { label: 'Comms', value: 'Comms' },
              ],
            },
          ]}
          emptyTitle="No audit records logged yet"
          emptyDescription="Audit records will automatically populate as actions are performed in the application."
        />
      </div>
    </DashboardLayout>
  );
}
