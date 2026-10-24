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
        status: user.status || 'Active',
        department: user.department || 'General',
        designation: user.designation || 'Staff',
        salary: user.salary || 60000,
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

module.exports = {
  protect,
  authorizeRoles,
  setFallbackUsersRef,
};
