'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Plus,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  CopyCheck,
  RefreshCw,
  Camera,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  Building2,
  Briefcase,
  Calendar,
  Lock,
} from 'lucide-react';
import { DashboardLayout } from '../../../components/DashboardLayout';
import { Modal } from '../../../components/Modal';
import { useToast } from '../../../components/Toast';
import { api, getStoredUser } from '../../../lib/api';

interface PermissionAction {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
}

interface ModulePermission {
  module: string;
  actions: PermissionAction;
  scope: 'Own' | 'Department' | 'Company';
}

interface RoleItem {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  permissions: ModulePermission[];
}

const MODULE_LABELS: Record<string, string> = {
  employees: 'Employees & Directory',
  attendance: 'Attendance & Check-in',
  leave: 'Leave & Time Off',
  payroll: 'Payroll Lite & Payslips',
  roles: 'Roles & Permissions',
  settings: 'Company Settings',
};

const DEFAULT_MODULES = ['employees', 'attendance', 'leave', 'payroll', 'roles', 'settings'];

export default function RolesAndTeamPage() {
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'roles' | 'team'>('roles');

  // Roles state
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Create Role Modal
  const [newRoleModalOpen, setNewRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [templateRoleId, setTemplateRoleId] = useState('');

  // Team Members state
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);

  // Add Member Modal
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Employee',
    department: '',
    newDepartment: '',
    designation: '',
    newDesignation: '',
    salary: '',
    currency: 'USD',
    joinDate: '',
    password: '',
    mustChangePassword: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [submittingMember, setSubmittingMember] = useState(false);
  const [customDeptMode, setCustomDeptMode] = useState(false);
  const [customDesigMode, setCustomDesigMode] = useState(false);

  // Fetch Roles
  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const res: any = await api.roles.list();
      if (res.success && res.roles) {
        setRoles(res.roles);
        if (!selectedRole && res.roles.length > 0) {
          setSelectedRole(res.roles[0]);
        } else if (selectedRole) {
          const current = res.roles.find((r: RoleItem) => (r._id || r.id) === (selectedRole._id || selectedRole.id));
          if (current) setSelectedRole(current);
        }
      }
    } catch (err: any) {
      toast.error('Failed to Load Roles', err.message || 'Could not fetch roles');
    } finally {
      setLoadingRoles(false);
    }
  };

  // Fetch Team Members & Settings
  const fetchTeamData = async () => {
    setLoadingTeam(true);
    try {
      const [empRes, setRes]: any = await Promise.all([
        api.employees.list(),
        api.settings.get(),
      ]);

      if (empRes.success && empRes.employees) {
        setTeamMembers(empRes.employees);
      }
      if (setRes.success && setRes.settings) {
        setDepartments(setRes.settings.departments || []);
        setDesignations(setRes.settings.designations || []);
      }
    } catch (err: any) {
      toast.error('Failed to Load Team', err.message || 'Could not fetch team data');
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    const user = getStoredUser();
    setCurrentUser(user);
    setMemberForm((prev) => ({
      ...prev,
      joinDate: prev.joinDate || new Date().toISOString().split('T')[0],
    }));
    fetchRoles();
    fetchTeamData();
  }, []);

  // Generate strong random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pass = 'MG#';
    for (let i = 0; i < 7; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setMemberForm((prev) => ({ ...prev, password: pass }));
  };

  // Copy password to clipboard
  const handleCopyPassword = () => {
    if (!memberForm.password) return;
    navigator.clipboard.writeText(memberForm.password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
    toast.success('Copied!', 'Password copied to clipboard');
  };

  // Toggle permission check in matrix
  const handleToggleAction = (moduleName: string, action: keyof PermissionAction) => {
    if (!selectedRole || (selectedRole.isSystem && selectedRole.name === 'Admin')) return;

    setSelectedRole((prev) => {
      if (!prev) return null;
      const updatedPermissions = [...prev.permissions];
      const modIdx = updatedPermissions.findIndex((p) => p.module === moduleName);

      if (modIdx !== -1) {
        const currentMod = { ...updatedPermissions[modIdx] };
        currentMod.actions = {
          ...currentMod.actions,
          [action]: !currentMod.actions[action],
        };
        updatedPermissions[modIdx] = currentMod;
      } else {
        const newMod: ModulePermission = {
          module: moduleName,
          actions: {
            view: false,
            create: false,
            edit: false,
            delete: false,
            approve: false,
            export: false,
            [action]: true,
          },
          scope: 'Company',
        };
        updatedPermissions.push(newMod);
      }

      return { ...prev, permissions: updatedPermissions };
    });
  };

  // Change scope for module in matrix
  const handleScopeChange = (moduleName: string, scope: 'Own' | 'Department' | 'Company') => {
    if (!selectedRole || (selectedRole.isSystem && selectedRole.name === 'Admin')) return;

    setSelectedRole((prev) => {
      if (!prev) return null;
      const updatedPermissions = [...prev.permissions];
      const modIdx = updatedPermissions.findIndex((p) => p.module === moduleName);
      if (modIdx !== -1) {
        updatedPermissions[modIdx] = {
          ...updatedPermissions[modIdx],
          scope,
        };
      }
      return { ...prev, permissions: updatedPermissions };
    });
  };

  // Save role permissions
  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    const roleId = selectedRole._id || selectedRole.id;
    if (!roleId) return;

    setSavingPermissions(true);
    try {
      const res: any = await api.roles.update(roleId, {
        description: selectedRole.description,
        permissions: selectedRole.permissions,
      });

      if (res.success) {
        toast.success('Permissions Saved', `Updated permissions matrix for "${selectedRole.name}".`);
        fetchRoles();
      } else {
        toast.error('Save Failed', res.message || 'Could not update role.');
      }
    } catch (err: any) {
      toast.error('Update Error', err.message || 'Failed to save role permissions.');
    } finally {
      setSavingPermissions(false);
    }
  };

  // Create Custom Role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      toast.warning('Name Required', 'Please provide a role title.');
      return;
    }

    try {
      let initialPerms: ModulePermission[] = [];
      if (templateRoleId) {
        const tmpl = roles.find((r) => (r._id || r.id) === templateRoleId);
        if (tmpl) initialPerms = JSON.parse(JSON.stringify(tmpl.permissions));
      }

      const res: any = await api.roles.create({
        name: newRoleName.trim(),
        description: newRoleDesc.trim(),
        permissions: initialPerms,
      });

      if (res.success) {
        toast.success('Role Created', `Custom role "${newRoleName}" has been established.`);
        setNewRoleModalOpen(false);
        setNewRoleName('');
        setNewRoleDesc('');
        setTemplateRoleId('');
        await fetchRoles();
        if (res.role) setSelectedRole(res.role);
      } else {
        toast.error('Creation Failed', res.message || 'Error creating role.');
      }
    } catch (err: any) {
      toast.error('Error', err.message || 'Failed to create role.');
    }
  };

  // Duplicate Role
  const handleDuplicateRole = async (roleId: string) => {
    try {
      const res: any = await api.roles.duplicate(roleId);
      if (res.success) {
        toast.success('Role Cloned', res.message || 'Role duplicated successfully.');
        await fetchRoles();
        if (res.role) setSelectedRole(res.role);
      }
    } catch (err: any) {
      toast.error('Error', err.message || 'Failed to duplicate role.');
    }
  };

  // Delete Role
  const handleDeleteRole = async (role: RoleItem) => {
    const roleId = role._id || role.id;
    if (!roleId) return;

    if (!confirm(`Are you sure you want to permanently delete custom role "${role.name}"?`)) {
      return;
    }

    try {
      const res: any = await api.roles.delete(roleId);
      if (res.success) {
        toast.success('Role Removed', `Role "${role.name}" deleted.`);
        const remaining = roles.filter((r) => (r._id || r.id) !== roleId);
        setRoles(remaining);
        if (remaining.length > 0) setSelectedRole(remaining[0]);
      } else {
        toast.error('Delete Failed', res.message || 'Could not delete role.');
      }
    } catch (err: any) {
      toast.error('Error', err.message || 'Failed to delete role.');
    }
  };

  // Submit New Team Member
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.name.trim() || !memberForm.email.trim()) {
      toast.warning('Required Fields', 'Full name and email are mandatory.');
      return;
    }

    const finalDept = customDeptMode ? memberForm.newDepartment.trim() : memberForm.department;
    const finalDesig = customDesigMode ? memberForm.newDesignation.trim() : memberForm.designation;

    setSubmittingMember(true);
    try {
      const payload = {
        name: memberForm.name.trim(),
        email: memberForm.email.trim(),
        phone: memberForm.phone.trim(),
        role: memberForm.role,
        department: finalDept || null,
        designation: finalDesig || null,
        salary: memberForm.salary ? Number(memberForm.salary) : null,
        joinDate: memberForm.joinDate || new Date().toISOString().split('T')[0],
        password: memberForm.password || undefined,
        mustChangePassword: memberForm.mustChangePassword,
      };

      const res: any = await api.employees.adminCreate(payload);
      if (res.success) {
        toast.success(
          'Member Added!',
          `Account created for ${res.employee.name}. Generated password: ${res.generatedPassword || memberForm.password}`
        );
        setAddMemberModalOpen(false);
        setMemberForm({
          name: '',
          email: '',
          phone: '',
          role: 'Employee',
          department: '',
          newDepartment: '',
          designation: '',
          newDesignation: '',
          salary: '',
          currency: 'USD',
          joinDate: new Date().toISOString().split('T')[0],
          password: '',
          mustChangePassword: true,
        });
        setCustomDeptMode(false);
        setCustomDesigMode(false);
        fetchTeamData();
      } else {
        toast.error('Creation Failed', res.message || 'Could not add member.');
      }
    } catch (err: any) {
      toast.error('Error', err.message || 'Failed to create team member.');
    } finally {
      setSubmittingMember(false);
    }
  };

  // Purge Face Data for a user
  const handlePurgeFaceData = async (userId: string, userName: string) => {
    if (!confirm(`Clear face biometric data for ${userName}? They will need to re-enroll to check in with face scan.`)) {
      return;
    }
    try {
      const res: any = await api.employees.deleteFaceData(userId);
      if (res.success) {
        toast.success('Biometrics Cleared', `Face data purged for ${userName}.`);
        fetchTeamData();
      }
    } catch (err: any) {
      toast.error('Error', err.message || 'Failed to clear face data');
    }
  };

  return (
    <DashboardLayout title="Roles & Team">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header Banner */}
        <div className="glass-panel p-6 rounded-2xl border border-[var(--border)] relative overflow-hidden bg-gradient-to-r from-blue-900/20 via-sky-950/20 to-transparent">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Administration Portal</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
                Roles & Team Management
              </h1>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Configure dynamic permissions, departments, designations, compensation, and biometric enrollment.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 bg-[var(--card)] p-1.5 rounded-xl border border-[var(--border)] shadow-sm">
              <button
                onClick={() => setActiveTab('roles')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'roles'
                    ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white shadow-md'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Roles & Permissions</span>
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'team'
                    ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white shadow-md'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Team Members</span>
              </button>
            </div>
          </div>
        </div>

        {/* ================= TAB 1: ROLES & PERMISSION MATRIX ================= */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            {/* Roles Header Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {roles.map((r) => {
                  const isSelected = selectedRole && (selectedRole._id || selectedRole.id) === (r._id || r.id);
                  return (
                    <button
                      key={r._id || r.id || r.name}
                      onClick={() => setSelectedRole(r)}
                      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all whitespace-nowrap ${
                        isSelected
                          ? 'border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--foreground)] shadow-sm ring-1 ring-[var(--primary)]'
                          : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)]/50'
                      }`}
                    >
                      <ShieldCheck
                        className={`w-4 h-4 ${isSelected ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}
                      />
                      <span>{r.name}</span>
                      {r.isSystem ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-400 font-mono">
                          System
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-400 font-mono">
                          Custom
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setNewRoleModalOpen(true)}
                className="btn btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shadow-sm hover:shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Create Custom Role</span>
              </button>
            </div>

            {/* Selected Role Permission Matrix Card */}
            {selectedRole ? (
              <div className="glass-panel rounded-2xl border border-[var(--border)] p-6 space-y-6 bg-[var(--card)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border)] gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-[var(--foreground)]">{selectedRole.name}</h2>
                      {selectedRole.isSystem && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium">
                          Built-in System Role
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                      {selectedRole.description || 'Full permissions matrix configuration for this company role.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDuplicateRole(selectedRole._id || selectedRole.id || '')}
                      className="btn btn-outline flex items-center gap-1.5 text-xs py-2 px-3 rounded-lg"
                      title="Clone this role as a new template"
                    >
                      <CopyCheck className="w-3.5 h-3.5" />
                      <span>Duplicate</span>
                    </button>

                    {!selectedRole.isSystem && (
                      <button
                        onClick={() => handleDeleteRole(selectedRole)}
                        className="btn btn-outline text-red-500 hover:bg-red-500/10 border-red-500/30 flex items-center gap-1.5 text-xs py-2 px-3 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}

                    <button
                      onClick={handleSavePermissions}
                      disabled={savingPermissions || (selectedRole.isSystem && selectedRole.name === 'Admin')}
                      className="btn btn-primary flex items-center gap-2 text-xs py-2 px-4 rounded-lg font-semibold"
                    >
                      {savingPermissions ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Permissions</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {selectedRole.isSystem && selectedRole.name === 'Admin' && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-2 text-xs text-blue-400">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>
                      The <strong>Admin</strong> role retains unrestricted access across all company domains to ensure
                      administrative continuity and prevent governance lockout.
                    </span>
                  </div>
                )}

                {/* Matrix Table */}
                <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[var(--card)]/80 border-b border-[var(--border)] text-xs uppercase font-bold text-[var(--muted-foreground)] tracking-wider">
                        <th className="py-3.5 px-4">Module / Resource</th>
                        <th className="py-3.5 px-3 text-center">View</th>
                        <th className="py-3.5 px-3 text-center">Create</th>
                        <th className="py-3.5 px-3 text-center">Edit</th>
                        <th className="py-3.5 px-3 text-center">Delete</th>
                        <th className="py-3.5 px-3 text-center">Approve</th>
                        <th className="py-3.5 px-3 text-center">Export</th>
                        <th className="py-3.5 px-4 text-center">Data Scope</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {DEFAULT_MODULES.map((modKey) => {
                        const perm = selectedRole.permissions.find((p) => p.module === modKey) || {
                          module: modKey,
                          actions: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
                          scope: 'Company',
                        };

                        const isAdminRole = selectedRole.isSystem && selectedRole.name === 'Admin';

                        return (
                          <tr key={modKey} className="hover:bg-[var(--card)]/50 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-[var(--foreground)]">
                              {MODULE_LABELS[modKey] || modKey}
                            </td>

                            {(['view', 'create', 'edit', 'delete', 'approve', 'export'] as (keyof PermissionAction)[]).map(
                              (act) => {
                                const isChecked = isAdminRole ? true : Boolean(perm.actions[act]);
                                return (
                                  <td key={act} className="py-3.5 px-3 text-center">
                                    <input
                                      type="checkbox"
                                      disabled={isAdminRole}
                                      checked={isChecked}
                                      onChange={() => handleToggleAction(modKey, act)}
                                      className="w-4 h-4 rounded text-[var(--primary)] border-[var(--border)] focus:ring-[var(--primary)] cursor-pointer disabled:cursor-not-allowed"
                                    />
                                  </td>
                                );
                              }
                            )}

                            <td className="py-3.5 px-4 text-center">
                              <select
                                disabled={isAdminRole}
                                value={perm.scope || 'Company'}
                                onChange={(e) => handleScopeChange(modKey, e.target.value as any)}
                                className="input text-xs py-1 px-2.5 rounded-lg border-[var(--border)] bg-[var(--background)] cursor-pointer disabled:opacity-75"
                              >
                                <option value="Company">Entire Company</option>
                                <option value="Department">Own Department</option>
                                <option value="Own">Own Records Only</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-[var(--muted-foreground)]">
                <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No role selected. Please select or create a role.</p>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: TEAM MEMBERS ================= */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)]">Company Team Directory</h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Admin-managed employee roster with role assignments, compensation, and biometric status.
                </p>
              </div>

              <button
                onClick={() => {
                  generatePassword();
                  setAddMemberModalOpen(true);
                }}
                className="btn btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Add Team Member</span>
              </button>
            </div>

            {/* Team Directory Table */}
            <div className="glass-panel rounded-2xl border border-[var(--border)] overflow-hidden bg-[var(--card)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-[var(--card)]/90 border-b border-[var(--border)] text-xs uppercase font-bold text-[var(--muted-foreground)] tracking-wider">
                      <th className="py-4 px-4">Member</th>
                      <th className="py-4 px-3">Role</th>
                      <th className="py-4 px-3">Department</th>
                      <th className="py-4 px-3">Designation</th>
                      <th className="py-4 px-3">Base Compensation</th>
                      <th className="py-4 px-3 text-center">Face Biometrics</th>
                      <th className="py-4 px-3">Status</th>
                      <th className="py-4 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {teamMembers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[var(--muted-foreground)]">
                          No team members registered yet. Click &quot;Add Team Member&quot; to onboard your team.
                        </td>
                      </tr>
                    ) : (
                      teamMembers.map((emp) => {
                        const hasFace = Array.isArray(emp.faceDescriptors) && emp.faceDescriptors.length > 0;
                        return (
                          <tr key={emp._id || emp.id} className="hover:bg-[var(--card)]/40 transition-colors">
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                  {emp.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-[var(--foreground)]">{emp.name}</div>
                                  <div className="text-xs text-[var(--muted-foreground)]">{emp.email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-3">
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400">
                                {emp.role || 'Employee'}
                              </span>
                            </td>

                            <td className="py-4 px-3 text-[var(--foreground)] font-medium">
                              {emp.department || <span className="text-[var(--muted-foreground)] italic">Unassigned</span>}
                            </td>

                            <td className="py-4 px-3 text-[var(--muted-foreground)]">
                              {emp.designation || <span className="italic">Staff</span>}
                            </td>

                            <td className="py-4 px-3 font-mono text-[var(--foreground)] font-medium">
                              {emp.salary !== null && emp.salary !== undefined
                                ? `$${Number(emp.salary).toLocaleString()}`
                                : <span className="text-[var(--muted-foreground)] italic">Not set</span>}
                            </td>

                            <td className="py-4 px-3 text-center">
                              {hasFace ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Enrolled</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-500/15 text-zinc-400">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Not Enrolled</span>
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                                  emp.status === 'Active'
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-rose-500/15 text-rose-400'
                                }`}
                              >
                                {emp.status || 'Active'}
                              </span>
                            </td>

                            <td className="py-4 px-4 text-right">
                              {hasFace && (
                                <button
                                  onClick={() => handlePurgeFaceData(emp._id || emp.id, emp.name)}
                                  className="text-xs text-rose-400 hover:text-rose-300 transition-colors p-1"
                                  title="Purge Face Biometric Data"
                                >
                                  Clear Face
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: CREATE CUSTOM ROLE ================= */}
        <Modal
          isOpen={newRoleModalOpen}
          onClose={() => setNewRoleModalOpen(false)}
          title="Create New Custom Role"
        >
          <form onSubmit={handleCreateRole} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Role Title *</label>
              <input
                required
                placeholder="e.g. Finance Officer, Team Lead"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Description</label>
              <textarea
                placeholder="Brief summary of duties and permission scope"
                rows={2}
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                className="input w-full resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Clone Permissions From</label>
              <select
                value={templateRoleId}
                onChange={(e) => setTemplateRoleId(e.target.value)}
                className="input w-full"
              >
                <option value="">Start Empty (No default permissions)</option>
                {roles.map((r) => (
                  <option key={r._id || r.id} value={r._id || r.id}>
                    Template: {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setNewRoleModalOpen(false)}
                className="btn btn-outline text-sm"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary text-sm font-semibold">
                Create Role
              </button>
            </div>
          </form>
        </Modal>

        {/* ================= MODAL: ADD TEAM MEMBER ================= */}
        <Modal
          isOpen={addMemberModalOpen}
          onClose={() => setAddMemberModalOpen(false)}
          title="Onboard New Team Member"
        >
          <form onSubmit={handleCreateMember} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
            {/* Full Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--muted-foreground)] mb-1">
                  Full Name *
                </label>
                <input
                  required
                  placeholder="e.g. John Doe"
                  value={memberForm.name}
                  onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[var(--muted-foreground)] mb-1">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="john@company.com"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  className="input w-full"
                />
              </div>
            </div>

            {/* Phone & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--muted-foreground)] mb-1">
                  Phone Number
                </label>
                <input
                  placeholder="+1 (555) 000-0000"
                  value={memberForm.phone}
                  onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[var(--muted-foreground)] mb-1">
                  Assigned Role *
                </label>
                <select
                  value={memberForm.role}
                  onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                  className="input w-full"
                >
                  {roles.map((r) => (
                    <option key={r._id || r.id || r.name} value={r.name}>
                      {r.name} {r.isSystem ? '(System)' : '(Custom)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Department */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase text-[var(--muted-foreground)]">Department</label>
                <button
                  type="button"
                  onClick={() => setCustomDeptMode(!customDeptMode)}
                  className="text-xs text-[var(--primary)] hover:underline font-semibold"
                >
                  {customDeptMode ? 'Choose Existing' : '+ Add New Department'}
                </button>
              </div>

              {customDeptMode ? (
                <input
                  placeholder="Enter new department name"
                  value={memberForm.newDepartment}
                  onChange={(e) => setMemberForm({ ...memberForm, newDepartment: e.target.value })}
                  className="input w-full"
                />
              ) : (
                <select
                  value={memberForm.department}
                  onChange={(e) => setMemberForm({ ...memberForm, department: e.target.value })}
                  className="input w-full"
                >
                  <option value="">Select Department (Optional)</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Designation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase text-[var(--muted-foreground)]">Designation / Title</label>
                <button
                  type="button"
                  onClick={() => setCustomDesigMode(!customDesigMode)}
                  className="text-xs text-[var(--primary)] hover:underline font-semibold"
                >
                  {customDesigMode ? 'Choose Existing' : '+ Add New Designation'}
                </button>
              </div>

              {customDesigMode ? (
                <input
                  placeholder="Enter new designation"
                  value={memberForm.newDesignation}
                  onChange={(e) => setMemberForm({ ...memberForm, newDesignation: e.target.value })}
                  className="input w-full"
                />
              ) : (
                <select
                  value={memberForm.designation}
                  onChange={(e) => setMemberForm({ ...memberForm, designation: e.target.value })}
                  className="input w-full"
                >
                  <option value="">Select Designation (Optional)</option>
                  {designations.map((desig) => (
                    <option key={desig} value={desig}>
                      {desig}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Compensation & Join Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--muted-foreground)] mb-1">
                  Base Salary ($ USD)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 75000"
                  value={memberForm.salary}
                  onChange={(e) => setMemberForm({ ...memberForm, salary: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[var(--muted-foreground)] mb-1">
                  Joining Date
                </label>
                <input
                  type="date"
                  value={memberForm.joinDate}
                  onChange={(e) => setMemberForm({ ...memberForm, joinDate: e.target.value })}
                  className="input w-full"
                />
              </div>
            </div>

            {/* Password Credentials Section */}
            <div className="p-3.5 bg-[var(--background)] border border-[var(--border)] rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase text-[var(--muted-foreground)] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span>Access Password</span>
                </label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="text-xs text-[var(--primary)] hover:underline font-semibold"
                >
                  Generate Strong Key
                </button>
              </div>

              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={memberForm.password}
                  onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
                  className="input w-full pr-20 font-mono text-sm"
                  placeholder="Enter or generate password"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="p-1 text-[var(--muted-foreground)] hover:text-[var(--primary)]"
                    title="Copy Password"
                  >
                    {copiedPassword ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--muted-foreground)] pt-1">
                <input
                  type="checkbox"
                  checked={memberForm.mustChangePassword}
                  onChange={(e) => setMemberForm({ ...memberForm, mustChangePassword: e.target.checked })}
                  className="w-4 h-4 rounded text-[var(--primary)]"
                />
                <span>Enforce mandatory password reset on first employee sign-in</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setAddMemberModalOpen(false)}
                className="btn btn-outline text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingMember}
                className="btn btn-primary text-sm font-semibold flex items-center gap-2"
              >
                {submittingMember && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save & Create Member</span>
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
