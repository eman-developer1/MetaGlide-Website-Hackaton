const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: { type: String, default: '' },
    userEmail: { type: String, default: '' },
    department: { type: String, default: null },
    companyId: { type: String, default: 'default-company', index: true },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      index: true,
    },
    checkIn: {
      type: Date,
      default: null,
    },
    checkOut: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['Present', 'Late', 'Half-day', 'Absent', 'On Leave'],
      default: 'Present',
    },
    workHours: {
      type: Number,
      default: 0,
    },
    method: {
      type: String,
      enum: ['face', 'manual', 'correction', 'system'],
      default: 'manual',
    },
    matchScore: {
      type: Number,
      default: null, // Euclidean distance (lower is better, e.g. 0.32)
    },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      accuracy: { type: Number, default: null },
    },
    livenessVerified: {
      type: Boolean,
      default: false,
    },
    suspiciousAttempts: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    correctionRequest: {
      requested: { type: Boolean, default: false },
      requestedCheckIn: { type: Date, default: null },
      requestedCheckOut: { type: Date, default: null },
      reason: { type: String, default: '' },
      status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
      },
      reviewedBy: { type: String, default: '' },
      reviewedAt: { type: Date, default: null },
      reviewComments: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ user: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
