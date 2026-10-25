import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';

export default function CreateEmployeePage() {
  const router = useRouter();
  const toast = useToast();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Employee',
    department: '',
    designation: '',
    salary: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.employees.adminCreate(form);
      toast.success('Employee created', 'The new employee can now log in.');
      router.push('/admin/employees');
    } catch (err: any) {
      toast.error('Failed', err?.message ?? 'An error occurred');
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-[var(--card)] rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Create Employee</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block font-medium mb-1">Full Name</label>
          <input
            required
            className="input w-full"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
        </div>

        {/* Email */}
        <div>
          <label className="block font-medium mb-1">Email</label>
          <input
            type="email"
            required
            className="input w-full"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
        </div>

        {/* Password */}
        <div>
          <label className="block font-medium mb-1">Temporary Password</label>
          <input
            type="password"
            required
            className="input w-full"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
          />
        </div>

        {/* Role */}
        <div>
          <label className="block font-medium mb-1">Role</label>
          <select
            required
            className="input w-full"
            value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value })}
          >
            <option value="Employee">Employee</option>
            <option value="HR">HR</option>
            <option value="Admin">Admin</option>
          </select>
        </div>

        {/* Department */}
        <div>
          <label className="block font-medium mb-1">Department</label>
          <input
            required
            className="input w-full"
            value={form.department}
            onChange={e => setForm({ ...form, department: e.target.value })}
          />
        </div>

        {/* Designation */}
        <div>
          <label className="block font-medium mb-1">Designation</label>
          <input
            required
            className="input w-full"
            value={form.designation}
            onChange={e => setForm({ ...form, designation: e.target.value })}
          />
        </div>

        {/* Salary */}
        <div>
          <label className="block font-medium mb-1">Base Salary</label>
          <input
            type="number"
            required
            className="input w-full"
            value={form.salary}
            onChange={e => setForm({ ...form, salary: e.target.value })}
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block font-medium mb-1">Phone (optional)</label>
          <input
            className="input w-full"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
          />
        </div>

        <button type="submit" className="btn-primary w-full">
          Create Employee
        </button>
      </form>
    </div>
  );
}
