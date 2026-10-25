const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { isDBConnected } = require('../config/db');
const dataStore = require('../services/dataStore');

// Helper to generate JWT Token
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_pakistan_auth_2026_xyz!@#';
  const expiresIn = process.env.JWT_EXPIRE || '7d';
  return jwt.sign({ id }, secret, { expiresIn });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
    } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all fields (name, email, password)',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const existing = await dataStore.findUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please sign in.',
      });
    }

    // First user auto-becomes Admin (company owner)
    const allUsers = await dataStore.findUsers();
    const assignedRole = allUsers.length === 0 ? 'Admin' : 'Employee';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const empCount = allUsers.length + 1;
    const employeeId = `MG-${1000 + empCount}`;

    const newUser = await dataStore.createUser({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: assignedRole,
      status: 'Active',
      // department, designation, salary are NOT set at signup
      // They will be configured by the Admin from the Roles & Team portal
      phone: phone || '',
      employeeId,
      joinDate: new Date(),
      leaveBalance: { casual: 10, sick: 10, annual: 14 },
    });

    const token = generateToken(newUser._id || newUser.id);

    // Audit log
    await dataStore.logAudit({
      userId: newUser._id || newUser.id,
      userName: newUser.name,
      userRole: newUser.role,
      action: 'USER_REGISTER',
      module: 'Auth',
      details: `User registered with role ${assignedRole}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: newUser._id || newUser.id,
        _id: newUser._id || newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department || null,
        designation: newUser.designation || null,
        salary: newUser.salary || null,
        employeeId: newUser.employeeId,
        leaveBalance: newUser.leaveBalance,
        createdAt: newUser.createdAt,
        storage: isDBConnected() ? 'MongoDB' : 'In-Memory Store',
      },
    });
  } catch (error) {
    console.error('[Register Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error occurred during sign up',
    });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await dataStore.findUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (user.status === 'Inactive') {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact an Administrator.',
      });
    }

    // Compare password
    let isMatch = false;
    if (typeof user.matchPassword === 'function') {
      isMatch = await user.matchPassword(password);
    } else {
      isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user._id || user.id);

    // Audit log
    await dataStore.logAudit({
      userId: user._id || user.id,
      userName: user.name,
      userRole: user.role,
      action: 'USER_LOGIN',
      module: 'Auth',
      details: `Successful sign in from ${req.ip || 'client'}`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: 'Welcome back! Signed in successfully.',
      token,
      user: {
        id: user._id || user.id,
        _id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'Employee',
        companyId: user.companyId || 'default-company',
        department: user.department || null,
        designation: user.designation || null,
        salary: user.salary !== undefined ? user.salary : null,
        employeeId: user.employeeId,
        leaveBalance: user.leaveBalance || { casual: 10, sick: 10, annual: 14 },
        mustChangePassword: user.mustChangePassword || false,
        createdAt: user.createdAt,
        storage: isDBConnected() ? 'MongoDB' : 'In-Memory Store',
      },
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error occurred during sign in',
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        id: req.user._id || req.user.id,
        _id: req.user._id || req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role || 'Employee',
        companyId: req.user.companyId || 'default-company',
        department: req.user.department || null,
        designation: req.user.designation || null,
        salary: req.user.salary !== undefined ? req.user.salary : null,
        employeeId: req.user.employeeId,
        phone: req.user.phone,
        leaveBalance: req.user.leaveBalance,
        mustChangePassword: req.user.mustChangePassword || false,
        createdAt: req.user.createdAt,
        storage: isDBConnected() ? 'MongoDB' : 'In-Memory Store',
      },
    });
  } catch (error) {
    console.error('[GetMe Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
    });
  }
};

// @desc    Change user password
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new passwords',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long',
      });
    }

    const user = await dataStore.findUserById(req.user.id || req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear mustChangePassword flag
    await dataStore.updateUser(req.user.id || req.user._id, {
      password: hashedPassword,
      mustChangePassword: false,
    });

    await dataStore.logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'PASSWORD_CHANGE',
      module: 'Auth',
      details: 'User successfully updated password',
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully!',
    });
  } catch (error) {
    console.error('[ChangePassword Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to change password',
    });
  }
};

// @desc    System & Database Health Check
// @route   GET /api/health
// @access  Public
const healthCheck = (req, res) => {
  const dbStatus = isDBConnected();
  res.status(200).json({
    success: true,
    server: 'online',
    app: 'MetaGlide HCM Lite',
    database: dbStatus ? 'connected' : 'in-memory fallback active',
    databaseType: 'MongoDB',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  changePassword,
  healthCheck,
};
