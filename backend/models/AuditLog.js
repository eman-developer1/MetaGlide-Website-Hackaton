const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: '',
    },
    userName: {
      type: String,
      default: 'System',
    },
    userRole: {
      type: String,
      default: 'Employee',
    },
    action: {
      type: String, // e.g., 'USER_LOGIN', 'CHECK_IN', 'LEAVE_APPLY', 'LEAVE_APPROVE', 'PAYROLL_FINALIZE'
      required: true,
      index: true,
    },
    module: {
      type: String, // 'Auth', 'Attendance', 'Leave', 'Payroll', 'Employee', 'Settings', 'AI'
      required: true,
      index: true,
    },
    details: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
