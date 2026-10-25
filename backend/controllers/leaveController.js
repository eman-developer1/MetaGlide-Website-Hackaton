const dataStore = require('../services/dataStore');

// Helper to calculate working days between two YYYY-MM-DD strings
const calculateDays = (startStr, endStr) => {
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (end < start) return 0;
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

// @desc    Apply for leave
// @route   POST /api/leave/apply
// @access  Private (All Roles)
const applyLeave = async (req, res) => {
  try {
    const { type, startDate, endDate, reason } = req.body;

    if (!type || !startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'All fields (type, startDate, endDate, reason) are required' });
    }

    const days = calculateDays(startDate, endDate);
    if (days <= 0) {
      return res.status(400).json({ success: false, message: 'End date cannot be earlier than start date' });
    }

    const user = await dataStore.findUserById(req.user.id);
    const balance = user.leaveBalance || { casual: 10, sick: 10, annual: 14 };

    const typeKey = type.toLowerCase();
    if (['casual', 'sick', 'annual'].includes(typeKey)) {
      if ((balance[typeKey] || 0) < days) {
        return res.status(400).json({
          success: false,
          message: `Insufficient ${type} leave balance. Remaining: ${balance[typeKey] || 0} days, requested: ${days} days.`,
        });
      }
    }

    const newLeave = await dataStore.createLeave({
      user: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      department: req.user.department || null,
      companyId: req.user.companyId || 'default-company',
      type,
      startDate,
      endDate,
      days,
      reason,
      status: 'Pending',
    });

    await dataStore.logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'LEAVE_APPLY',
      module: 'Leave',
      details: `Applied for ${days} days ${type} leave (${startDate} to ${endDate})`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully!',
      leave: newLeave,
    });
  } catch (error) {
    console.error('[ApplyLeave Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Get caller's leaves and current balance
// @route   GET /api/leave/my-leaves
// @access  Private
const getMyLeaves = async (req, res) => {
  try {
    const user = await dataStore.findUserById(req.user.id);
    const leaves = await dataStore.findLeaves({ user: req.user.id });

    return res.status(200).json({
      success: true,
      balance: user?.leaveBalance || { casual: 10, sick: 10, annual: 14 },
      leaves,
    });
  } catch (error) {
    console.error('[GetMyLeaves Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Get all leave requests (for Admin / HR inbox)
// @route   GET /api/leave/all
// @access  Private (Admin, HR)
const getAllLeaves = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status && status !== 'All' ? { status } : {};
    const leaves = await dataStore.findLeaves(query);

    const counts = {
      pending: leaves.filter((l) => l.status === 'Pending').length,
      approved: leaves.filter((l) => l.status === 'Approved').length,
      rejected: leaves.filter((l) => l.status === 'Rejected').length,
      total: leaves.length,
    };

    return res.status(200).json({
      success: true,
      counts,
      leaves,
    });
  } catch (error) {
    console.error('[GetAllLeaves Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Review / Approve / Reject leave
// @route   PUT /api/leave/:id/status
// @access  Private (Admin, HR)
const reviewLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body; // status: 'Approved' | 'Rejected'

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be Approved or Rejected' });
    }

    const leave = await dataStore.findLeaveById(id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (leave.status !== 'Pending') {
      return res.status(400).json({ success: false, message: `This leave request is already ${leave.status}` });
    }

    // Deduct leave balance if approved
    if (status === 'Approved') {
      const user = await dataStore.findUserById(leave.user);
      if (user) {
        const typeKey = leave.type.toLowerCase();
        const balance = { ...(user.leaveBalance || { casual: 10, sick: 10, annual: 14 }) };
        if (balance[typeKey] !== undefined) {
          balance[typeKey] = Math.max(0, balance[typeKey] - leave.days);
          await dataStore.updateUser(user._id || user.id, { leaveBalance: balance });
        }
      }
    }

    const updated = await dataStore.updateLeave(id, {
      status,
      reviewedBy: req.user.name,
      reviewedAt: new Date(),
      reviewNotes: reviewNotes || '',
    });

    // Send notification to employee
    await dataStore.createNotification({
      user: leave.user,
      title: `Leave Application ${status}`,
      message: `Your ${leave.type} leave for ${leave.startDate} to ${leave.endDate} was ${status.toLowerCase()} by ${req.user.name}.`,
      type: status === 'Approved' ? 'success' : 'danger',
    });

    await dataStore.logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: status === 'Approved' ? 'LEAVE_APPROVE' : 'LEAVE_REJECT',
      module: 'Leave',
      details: `${status} leave for ${leave.userName} (${leave.days} days ${leave.type})`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Leave application ${status.toLowerCase()} successfully`,
      leave: updated,
    });
  } catch (error) {
    console.error('[ReviewLeave Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  reviewLeave,
};
