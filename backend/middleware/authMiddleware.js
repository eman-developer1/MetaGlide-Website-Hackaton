const jwt = require('jsonwebtoken');
const dataStore = require('../services/dataStore');

// In-memory store fallback reference for backwards compatibility
let fallbackUsers = [];
const setFallbackUsersRef = (users) => {
  fallbackUsers = users;
};

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_pakistan_auth_2026_xyz!@#';
      const decoded = jwt.verify(token, secret);

      const user = await dataStore.findUserById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User no longer exists in database or session expired',
        });
      }

      if (user.status === 'Inactive') {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated. Please contact an Administrator.',
        });
      }

      req.user = {
        _id: user._id?.toString() || user.id?.toString(),
        id: user._id?.toString() || user.id?.toString(),
        name: user.name,
        email: user.email,
        role: user.role || 'Employee',
        companyId: user.companyId || 'default-company',
        customRoleId: user.customRoleId || null,
        status: user.status || 'Active',
        department: user.department || null,
        designation: user.designation || null,
        salary: user.salary !== undefined ? user.salary : null,
        employeeId: user.employeeId || '',
        phone: user.phone || '',
        leaveBalance: user.leaveBalance || { casual: 10, sick: 10, annual: 14 },
        createdAt: user.createdAt,
      };

      return next();
    } catch (error) {
      console.error('[Auth Middleware Error]:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, invalid or expired token',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided',
    });
  }
};

// Role-Based Access Control Middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${allowedRoles.join(', ')}] roles. Your role is '${req.user?.role || 'Guest'}'.`,
      });
    }
    next();
  };
};

// Dynamic Permission Matrix Check Middleware
// module: 'employees' | 'attendance' | 'leave' | 'payroll' | 'settings' | 'roles'
// action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export'
const checkPermission = (moduleName, action = 'view') => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    // Admin always has full access
    if (req.user.role === 'Admin') {
      return next();
    }

    try {
      const dataStore = require('../services/dataStore');
      // Look up role by customRoleId or name
      let role = null;
      if (req.user.customRoleId) {
        role = await dataStore.findRoleById?.(req.user.customRoleId);
      }
      if (!role) {
        role = await dataStore.findRoleByName?.(req.user.role, req.user.companyId);
      }

      if (role && role.permissions) {
        const modPerm = role.permissions.find(
          (p) => p.module?.toLowerCase() === moduleName?.toLowerCase()
        );
        if (modPerm && modPerm.actions && modPerm.actions[action]) {
          req.permissionScope = modPerm.scope || 'Company';
          return next();
        }
      }

      // Default fallback for HR role if no custom role matrix set
      if (req.user.role === 'HR') {
        // HR has access to employees, attendance, leave, payroll (except roles/settings admin-only)
        if (['employees', 'attendance', 'leave', 'payroll'].includes(moduleName.toLowerCase())) {
          return next();
        }
      }

      return res.status(403).json({
        success: false,
        message: `Forbidden: You do not have permission to ${action} ${moduleName}.`,
      });
    } catch (err) {
      console.error('[checkPermission Error]:', err);
      // Fallback to authorizeRoles
      if (req.user.role === 'Admin' || req.user.role === 'HR') {
        return next();
      }
      return res.status(403).json({ success: false, message: 'Permission check failed' });
    }
  };
};

module.exports = {
  protect,
  authorizeRoles,
  checkPermission,
  setFallbackUsersRef,
};
