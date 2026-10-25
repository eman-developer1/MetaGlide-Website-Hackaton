const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      default: 'MetaGlide Marketing',
    },
    tagline: {
      type: String,
      default: 'Effortless Digital Growth',
    },
    workHours: {
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '18:00' },
      lateThresholdTime: { type: String, default: '09:30' },
      workDaysPerWeek: { type: Number, default: 5 },
      weeklyTargetHours: { type: Number, default: 40 },
    },
    leaveQuotas: {
      casual: { type: Number, default: 10 },
      sick: { type: Number, default: 10 },
      annual: { type: Number, default: 14 },
    },
    departments: {
      type: [String],
      default: [
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
    designations: {
      type: [String],
      default: [
        'Software Engineer',
        'Product Manager',
        'HR Specialist',
        'Marketing Lead',
        'Account Executive',
        'UI/UX Designer',
      ],
    },
    faceAttendance: {
      enabled: { type: Boolean, default: true },
      threshold: { type: Number, default: 0.5 },
      requireLiveness: { type: Boolean, default: true },
      requireLocation: { type: Boolean, default: false },
      officeLocation: {
        lat: { type: Number, default: 31.5204 }, // Default Lahore / MetaGlide HQ
        lng: { type: Number, default: 74.3587 },
      },
      radiusMeters: { type: Number, default: 500 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
