const { isDBConnected } = require('../config/db');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Payroll = require('../models/Payroll');
const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const AILog = require('../models/AILog');
const Settings = require('../models/Settings');
const Role = require('../models/Role');

// Global In-Memory Stores for Offline Resilience
const memoryStore = {
  users: [],
  roles: [],
  attendance: [],
  leaves: [],
  payrolls: [],
  announcements: [],
  notifications: [],
  auditLogs: [],
  aiLogs: [],
  settings: {
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
  },
};

const makeId = (prefix = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

const dataStore = {
  memoryStore,

  // ================= USERS =================
  async findUsers(query = {}) {
    if (isDBConnected()) {
      return await User.find(query).select('-password').sort({ createdAt: -1 });
    }
    return memoryStore.users.filter((u) => {
      for (const [k, v] of Object.entries(query)) {
        if (u[k] !== v) return false;
      }
      return true;
    }).map(({ password, ...rest }) => rest);
  },

  async findUserById(id) {
    if (!id) return null;
    if (isDBConnected()) {
      try {
        return await User.findById(id);
      } catch (e) {
        // ID might be in-memory string format
      }
    }
    return memoryStore.users.find((u) => u._id?.toString() === id?.toString() || u.id?.toString() === id?.toString()) || null;
  },

  async findUserByEmail(email) {
    if (!email) return null;
    const normalized = email.toLowerCase().trim();
    if (isDBConnected()) {
      return await User.findOne({ email: normalized });
    }
    return memoryStore.users.find((u) => u.email.toLowerCase() === normalized) || null;
  },

  async createUser(userData) {
    if (isDBConnected()) {
      return await User.create(userData);
    }
    const newUser = {
      _id: makeId('usr'),
      id: makeId('usr'),
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryStore.users.push(newUser);
    return newUser;
  },

  async updateUser(id, updateData) {
    if (isDBConnected()) {
      try {
        return await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
      } catch (e) {}
    }
    const idx = memoryStore.users.findIndex((u) => u._id?.toString() === id?.toString() || u.id?.toString() === id?.toString());
    if (idx !== -1) {
      memoryStore.users[idx] = { ...memoryStore.users[idx], ...updateData, updatedAt: new Date() };
      const { password, ...safeUser } = memoryStore.users[idx];
      return safeUser;
    }
    return null;
  },

  async deleteUser(id) {
    if (isDBConnected()) {
      try {
        return await User.findByIdAndDelete(id);
      } catch (e) {}
    }
    const idx = memoryStore.users.findIndex((u) => u._id?.toString() === id?.toString() || u.id?.toString() === id?.toString());
    if (idx !== -1) {
      return memoryStore.users.splice(idx, 1)[0];
    }
    return null;
  },

  // ================= ATTENDANCE =================
  async findAttendance(query = {}) {
    if (isDBConnected()) {
      return await Attendance.find(query).sort({ date: -1, createdAt: -1 });
    }
    return memoryStore.attendance.filter((item) => {
      for (const [k, v] of Object.entries(query)) {
        if (item[k]?.toString() !== v?.toString()) return false;
      }
      return true;
    }).sort((a, b) => (b.date > a.date ? 1 : -1));
  },

  async findAttendanceToday(userId, dateStr) {
    if (isDBConnected()) {
      try {
        return await Attendance.findOne({ user: userId, date: dateStr });
      } catch (e) {}
    }
    return memoryStore.attendance.find(
      (a) => (a.user?.toString() === userId?.toString() || a.userId?.toString() === userId?.toString()) && a.date === dateStr
    ) || null;
  },

  async createOrUpdateAttendance(record) {
    const { user, date } = record;
    if (isDBConnected()) {
      try {
        return await Attendance.findOneAndUpdate(
          { user, date },
          { $set: record },
          { upsert: true, new: true }
        );
      } catch (e) {}
    }
    const idx = memoryStore.attendance.findIndex(
      (a) => (a.user?.toString() === user?.toString() || a.userId?.toString() === user?.toString()) && a.date === date
    );
    if (idx !== -1) {
      memoryStore.attendance[idx] = { ...memoryStore.attendance[idx], ...record, updatedAt: new Date() };
      return memoryStore.attendance[idx];
    }
    const newAtt = {
      _id: makeId('att'),
      id: makeId('att'),
      ...record,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryStore.attendance.push(newAtt);
    return newAtt;
  },

  async findAttendanceById(id) {
    if (isDBConnected()) {
      try {
        return await Attendance.findById(id);
      } catch (e) {}
    }
    return memoryStore.attendance.find((a) => a._id?.toString() === id?.toString() || a.id?.toString() === id?.toString()) || null;
  },

  // ================= LEAVES =================
  async findLeaves(query = {}) {
    if (isDBConnected()) {
      return await Leave.find(query).sort({ createdAt: -1 });
    }
    return memoryStore.leaves.filter((item) => {
      for (const [k, v] of Object.entries(query)) {
        if (item[k]?.toString() !== v?.toString()) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async findLeaveById(id) {
    if (isDBConnected()) {
      try {
        return await Leave.findById(id);
      } catch (e) {}
    }
    return memoryStore.leaves.find((l) => l._id?.toString() === id?.toString() || l.id?.toString() === id?.toString()) || null;
  },

  async createLeave(leaveData) {
    if (isDBConnected()) {
      return await Leave.create(leaveData);
    }
    const newLeave = {
      _id: makeId('lv'),
      id: makeId('lv'),
      ...leaveData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryStore.leaves.push(newLeave);
    return newLeave;
  },

  async updateLeave(id, updateData) {
    if (isDBConnected()) {
      try {
        return await Leave.findByIdAndUpdate(id, updateData, { new: true });
      } catch (e) {}
    }
    const idx = memoryStore.leaves.findIndex((l) => l._id?.toString() === id?.toString() || l.id?.toString() === id?.toString());
    if (idx !== -1) {
      memoryStore.leaves[idx] = { ...memoryStore.leaves[idx], ...updateData, updatedAt: new Date() };
      return memoryStore.leaves[idx];
    }
    return null;
  },

  // ================= PAYROLL =================
  async findPayrolls(query = {}) {
    if (isDBConnected()) {
      return await Payroll.find(query).sort({ year: -1, month: -1 });
    }
    return memoryStore.payrolls.filter((p) => {
      for (const [k, v] of Object.entries(query)) {
        if (p[k]?.toString() !== v?.toString()) return false;
      }
      return true;
    }).sort((a, b) => b.year - a.year || b.month - a.month);
  },

  async findPayrollById(id) {
    if (isDBConnected()) {
      try {
        return await Payroll.findById(id);
      } catch (e) {}
    }
    return memoryStore.payrolls.find((p) => p._id?.toString() === id?.toString() || p.id?.toString() === id?.toString()) || null;
  },

  async findPayrollByMonthYear(month, year) {
    if (isDBConnected()) {
      return await Payroll.findOne({ month: Number(month), year: Number(year) });
    }
    return memoryStore.payrolls.find((p) => Number(p.month) === Number(month) && Number(p.year) === Number(year)) || null;
  },

  async createOrUpdatePayroll(payrollData) {
    const { month, year } = payrollData;
    if (isDBConnected()) {
      return await Payroll.findOneAndUpdate(
        { month: Number(month), year: Number(year) },
        { $set: payrollData },
        { upsert: true, new: true }
      );
    }
    const idx = memoryStore.payrolls.findIndex(
      (p) => Number(p.month) === Number(month) && Number(p.year) === Number(year)
    );
    if (idx !== -1) {
      memoryStore.payrolls[idx] = { ...memoryStore.payrolls[idx], ...payrollData, updatedAt: new Date() };
      return memoryStore.payrolls[idx];
    }
    const newPayroll = {
      _id: makeId('pr'),
      id: makeId('pr'),
      ...payrollData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryStore.payrolls.push(newPayroll);
    return newPayroll;
  },

  // ================= ANNOUNCEMENTS =================
  async findAnnouncements(targetRole = null) {
    if (isDBConnected()) {
      const q = targetRole && targetRole !== 'Admin'
        ? { targetRole: { $in: ['All', targetRole] } }
        : {};
      return await Announcement.find(q).sort({ pinned: -1, createdAt: -1 });
    }
    return memoryStore.announcements.filter((a) => {
      if (!targetRole || targetRole === 'Admin' || a.targetRole === 'All' || a.targetRole === targetRole) {
        return true;
      }
      return false;
    }).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.createdAt) - new Date(a.createdAt));
  },

  async createAnnouncement(data) {
    if (isDBConnected()) {
      return await Announcement.create(data);
    }
    const newAnn = {
      _id: makeId('ann'),
      id: makeId('ann'),
      ...data,
      createdAt: new Date(),
    };
    memoryStore.announcements.push(newAnn);
    return newAnn;
  },

  async deleteAnnouncement(id) {
    if (isDBConnected()) {
      try {
        return await Announcement.findByIdAndDelete(id);
      } catch (e) {}
    }
    const idx = memoryStore.announcements.findIndex((a) => a._id?.toString() === id?.toString() || a.id?.toString() === id?.toString());
    if (idx !== -1) return memoryStore.announcements.splice(idx, 1)[0];
    return null;
  },

  // ================= NOTIFICATIONS =================
  async findNotifications(userId) {
    if (isDBConnected()) {
      try {
        return await Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(30);
      } catch (e) {}
    }
    return memoryStore.notifications.filter(
      (n) => n.user?.toString() === userId?.toString() || n.userId?.toString() === userId?.toString()
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 30);
  },

  async createNotification(notifData) {
    if (isDBConnected()) {
      try {
        return await Notification.create(notifData);
      } catch (e) {}
    }
    const newNotif = {
      _id: makeId('ntf'),
      id: makeId('ntf'),
      ...notifData,
      read: false,
      createdAt: new Date(),
    };
    memoryStore.notifications.push(newNotif);
    return newNotif;
  },

  async markNotificationsRead(userId) {
    if (isDBConnected()) {
      try {
        await Notification.updateMany({ user: userId, read: false }, { $set: { read: true } });
        return true;
      } catch (e) {}
    }
    memoryStore.notifications.forEach((n) => {
      if (n.user?.toString() === userId?.toString() || n.userId?.toString() === userId?.toString()) {
        n.read = true;
      }
    });
    return true;
  },

  // ================= AUDIT LOGS =================
  async logAudit({ userId, userName, userRole, action, module, details, ipAddress }) {
    const entry = {
      userId: userId || 'system',
      userName: userName || 'System',
      userRole: userRole || 'System',
      action,
      module,
      details: typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
      ipAddress: ipAddress || '127.0.0.1',
      timestamp: new Date(),
    };
    if (isDBConnected()) {
      try {
        await AuditLog.create(entry);
      } catch (e) {
        memoryStore.auditLogs.unshift({ _id: makeId('aud'), id: makeId('aud'), ...entry });
      }
    } else {
      memoryStore.auditLogs.unshift({ _id: makeId('aud'), id: makeId('aud'), ...entry });
      if (memoryStore.auditLogs.length > 500) memoryStore.auditLogs.pop();
    }
  },

  async findAuditLogs(limit = 100) {
    if (isDBConnected()) {
      return await AuditLog.find().sort({ timestamp: -1 }).limit(limit);
    }
    return memoryStore.auditLogs.slice(0, limit);
  },

  // ================= AI LOGS =================
  async logAI(aiLogData) {
    const entry = {
      ...aiLogData,
      timestamp: new Date(),
    };
    if (isDBConnected()) {
      try {
        await AILog.create(entry);
      } catch (e) {
        memoryStore.aiLogs.unshift({ _id: makeId('ailog'), id: makeId('ailog'), ...entry });
      }
    } else {
      memoryStore.aiLogs.unshift({ _id: makeId('ailog'), id: makeId('ailog'), ...entry });
      if (memoryStore.aiLogs.length > 500) memoryStore.aiLogs.pop();
    }
  },

  async findAILogs(limit = 100) {
    if (isDBConnected()) {
      return await AILog.find().sort({ timestamp: -1 }).limit(limit);
    }
    return memoryStore.aiLogs.slice(0, limit);
  },

  // ================= SETTINGS =================
  async getSettings() {
    if (isDBConnected()) {
      const doc = await Settings.findOne();
      if (doc) return doc;
      return await Settings.create(memoryStore.settings);
    }
    return memoryStore.settings;
  },

  async updateSettings(updateData) {
    if (isDBConnected()) {
      const doc = await Settings.findOneAndUpdate({}, { $set: updateData }, { upsert: true, new: true });
      return doc;
    }
    memoryStore.settings = { ...memoryStore.settings, ...updateData };
    return memoryStore.settings;
  },

  // ================= ROLES =================
  getDefaultRoles(companyId = 'default-company') {
    return [
      {
        name: 'Admin',
        description: 'Full administrative access to all modules and company settings',
        companyId,
        isSystem: true,
        permissions: [
          { module: 'employees', actions: { view: true, create: true, edit: true, delete: true, approve: true, export: true }, scope: 'Company' },
          { module: 'attendance', actions: { view: true, create: true, edit: true, delete: true, approve: true, export: true }, scope: 'Company' },
          { module: 'leave', actions: { view: true, create: true, edit: true, delete: true, approve: true, export: true }, scope: 'Company' },
          { module: 'payroll', actions: { view: true, create: true, edit: true, delete: true, approve: true, export: true }, scope: 'Company' },
          { module: 'roles', actions: { view: true, create: true, edit: true, delete: true, approve: true, export: true }, scope: 'Company' },
          { module: 'settings', actions: { view: true, create: true, edit: true, delete: true, approve: true, export: true }, scope: 'Company' },
        ],
      },
      {
        name: 'HR',
        description: 'Human Resources management: employees, attendance, leave, and payroll',
        companyId,
        isSystem: true,
        permissions: [
          { module: 'employees', actions: { view: true, create: true, edit: true, delete: true, approve: true, export: true }, scope: 'Company' },
          { module: 'attendance', actions: { view: true, create: true, edit: true, delete: true, approve: true, export: true }, scope: 'Company' },
          { module: 'leave', actions: { view: true, create: true, edit: true, delete: true, approve: true, export: true }, scope: 'Company' },
          { module: 'payroll', actions: { view: true, create: true, edit: true, delete: false, approve: true, export: true }, scope: 'Company' },
          { module: 'roles', actions: { view: false, create: false, edit: false, delete: false, approve: false, export: false }, scope: 'Company' },
          { module: 'settings', actions: { view: false, create: false, edit: false, delete: false, approve: false, export: false }, scope: 'Company' },
        ],
      },
      {
        name: 'Employee',
        description: 'Standard employee portal with personal attendance, leave, and payslips',
        companyId,
        isSystem: true,
        permissions: [
          { module: 'employees', actions: { view: true, create: false, edit: false, delete: false, approve: false, export: false }, scope: 'Own' },
          { module: 'attendance', actions: { view: true, create: true, edit: false, delete: false, approve: false, export: false }, scope: 'Own' },
          { module: 'leave', actions: { view: true, create: true, edit: false, delete: false, approve: false, export: false }, scope: 'Own' },
          { module: 'payroll', actions: { view: true, create: false, edit: false, delete: false, approve: false, export: false }, scope: 'Own' },
          { module: 'roles', actions: { view: false, create: false, edit: false, delete: false, approve: false, export: false }, scope: 'Own' },
          { module: 'settings', actions: { view: false, create: false, edit: false, delete: false, approve: false, export: false }, scope: 'Own' },
        ],
      },
    ];
  },

  async seedDefaultRoles(companyId = 'default-company') {
    const defaults = this.getDefaultRoles(companyId);
    if (isDBConnected()) {
      for (const r of defaults) {
        const exists = await Role.findOne({ name: r.name, companyId });
        if (!exists) {
          await Role.create(r);
        }
      }
    } else {
      for (const r of defaults) {
        const exists = memoryStore.roles.find((item) => item.name === r.name && item.companyId === companyId);
        if (!exists) {
          memoryStore.roles.push({ _id: makeId('rol'), id: makeId('rol'), ...r, createdAt: new Date() });
        }
      }
    }
  },

  async findRoles(companyId = 'default-company') {
    await this.seedDefaultRoles(companyId);
    if (isDBConnected()) {
      return await Role.find({ companyId }).sort({ isSystem: -1, createdAt: 1 });
    }
    return memoryStore.roles.filter((r) => !r.companyId || r.companyId === companyId);
  },

  async findRoleById(id) {
    if (!id) return null;
    if (isDBConnected()) {
      try {
        return await Role.findById(id);
      } catch (e) {}
    }
    return memoryStore.roles.find((r) => r._id?.toString() === id?.toString() || r.id?.toString() === id?.toString()) || null;
  },

  async findRoleByName(name, companyId = 'default-company') {
    if (!name) return null;
    if (isDBConnected()) {
      return await Role.findOne({ name: new RegExp(`^${name}$`, 'i'), companyId });
    }
    return memoryStore.roles.find(
      (r) => r.name?.toLowerCase() === name?.toLowerCase() && (!r.companyId || r.companyId === companyId)
    ) || null;
  },

  async createRole(roleData) {
    if (isDBConnected()) {
      return await Role.create(roleData);
    }
    const newRole = {
      _id: makeId('rol'),
      id: makeId('rol'),
      ...roleData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryStore.roles.push(newRole);
    return newRole;
  },

  async updateRole(id, updateData) {
    if (isDBConnected()) {
      try {
        return await Role.findByIdAndUpdate(id, updateData, { new: true });
      } catch (e) {}
    }
    const idx = memoryStore.roles.findIndex((r) => r._id?.toString() === id?.toString() || r.id?.toString() === id?.toString());
    if (idx !== -1) {
      memoryStore.roles[idx] = { ...memoryStore.roles[idx], ...updateData, updatedAt: new Date() };
      return memoryStore.roles[idx];
    }
    return null;
  },

  async deleteRole(id) {
    if (isDBConnected()) {
      try {
        return await Role.findByIdAndDelete(id);
      } catch (e) {}
    }
    const idx = memoryStore.roles.findIndex((r) => r._id?.toString() === id?.toString() || r.id?.toString() === id?.toString());
    if (idx !== -1) {
      return memoryStore.roles.splice(idx, 1)[0];
    }
    return null;
  },
};

module.exports = dataStore;
