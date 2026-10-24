const mongoose = require('mongoose');

const payrollRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  employeeId: { type: String, default: '' },
  name: { type: String, required: true },
  email: { type: String, required: true },
  department: { type: String, default: 'General' },
  designation: { type: String, default: 'Staff' },
  basicSalary: { type: Number, required: true, default: 0 },
  allowances: {
    housing: { type: Number, default: 0 },
    transport: { type: Number, default: 0 },
    medical: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  deductions: {
    tax: { type: Number, default: 0 },
    unpaidLeave: { type: Number, default: 0 },
    insurance: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  netSalary: { type: Number, required: true, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Processed', 'Paid'],
    default: 'Pending',
  },
});

const payrollSchema = new mongoose.Schema(
  {
    month: {
      type: Number, // 1 - 12
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    title: {
      type: String, // e.g. "October 2026 Payroll"
      required: true,
    },
    status: {
      type: String,
      enum: ['Draft', 'Finalized'],
      default: 'Draft',
    },
    totalCost: {
      type: Number,
      default: 0,
    },
    totalEmployees: {
      type: Number,
      default: 0,
    },
    records: [payrollRecordSchema],
    finalizedBy: {
      type: String,
      default: '',
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

payrollSchema.index({ month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Payroll', payrollSchema);
