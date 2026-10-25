const mongoose = require('mongoose');

const permissionActionSchema = new mongoose.Schema(
  {
    view: { type: Boolean, default: false },
    create: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
    approve: { type: Boolean, default: false },
    export: { type: Boolean, default: false },
  },
  { _id: false }
);

const modulePermissionSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      required: true,
      enum: ['employees', 'attendance', 'leave', 'payroll', 'roles', 'settings'],
    },
    actions: {
      type: permissionActionSchema,
      default: () => ({}),
    },
    scope: {
      type: String,
      enum: ['Own', 'Department', 'Company'],
      default: 'Company',
    },
  },
  { _id: false }
);

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a role name'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    companyId: {
      type: String,
      default: 'default-company',
      index: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    permissions: [modulePermissionSchema],
  },
  {
    timestamps: true,
  }
);

roleSchema.index({ name: 1, companyId: 1 });

module.exports = mongoose.model('Role', roleSchema);
