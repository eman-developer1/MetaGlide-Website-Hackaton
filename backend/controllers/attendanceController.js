const dataStore = require('../services/dataStore');

// Helper to format Date as YYYY-MM-DD in local time
const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Euclidean distance between two 128D face descriptor vectors
const euclideanDistance = (arr1, arr2) => {
  if (!arr1 || !arr2 || arr1.length !== arr2.length) return 999;
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    const diff = arr1[i] - arr2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

// Haversine distance in meters
const getHaversineDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// @desc    Face Biometric Check In
// @route   POST /api/attendance/face-check-in
// @access  Private (All Roles)
const faceCheckIn = async (req, res) => {
  try {
    const { descriptor, livenessVerified, location, notes } = req.body;
    const todayStr = getTodayDateStr();

    // 1. Check existing check-in for today
    const existing = await dataStore.findAttendanceToday(req.user.id, todayStr);
    if (existing && existing.checkIn) {
      return res.status(409).json({
        success: false,
        message: `You have already checked in today at ${new Date(existing.checkIn).toLocaleTimeString()}! Duplicate check-in is not allowed.`,
        attendance: existing,
      });
    }

    // 2. Retrieve user and verify face enrollment
    const user = await dataStore.findUserById(req.user.id);
    if (!user || !user.faceDescriptors || user.faceDescriptors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No face biometric enrolled for your account. Please contact your Admin/HR or enroll via your profile first.',
      });
    }

    // 3. Retrieve settings
    const settings = await dataStore.getSettings();
    const faceSettings = settings.faceAttendance || {
      enabled: true,
      threshold: 0.5,
      requireLiveness: true,
      requireLocation: false,
      officeLocation: { lat: 31.5204, lng: 74.3587 },
      radiusMeters: 500,
    };

    if (faceSettings.enabled === false) {
      return res.status(400).json({
        success: false,
        message: 'Face check-in is currently disabled by company policy.',
      });
    }

    // 4. Liveness check verification
    if (faceSettings.requireLiveness && !livenessVerified) {
      return res.status(400).json({
        success: false,
        message: 'Liveness verification failed. Please ensure you blink or move naturally in front of the camera.',
      });
    }

    // 5. Geo-fence location check
    if (faceSettings.requireLocation) {
      if (!location || location.lat === undefined || location.lng === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Location verification is required for attendance. Please enable GPS permissions.',
        });
      }

      if (location.accuracy && location.accuracy > 100) {
        return res.status(400).json({
          success: false,
          message: `GPS accuracy too low (${Math.round(location.accuracy)}m > 100m threshold). Please move to an open area with better satellite coverage.`,
        });
      }

      const dist = getHaversineDistanceMeters(
        location.lat,
        location.lng,
        faceSettings.officeLocation.lat,
        faceSettings.officeLocation.lng
      );

      if (dist > faceSettings.radiusMeters) {
        return res.status(400).json({
          success: false,
          message: `Outside permitted office perimeter (${Math.round(dist)}m away, allowed radius: ${faceSettings.radiusMeters}m).`,
        });
      }
    }

    // 6. Biometric descriptor matching (Euclidean distance)
    if (!descriptor || !Array.isArray(descriptor)) {
      return res.status(400).json({
        success: false,
        message: 'Valid face scan descriptor is missing.',
      });
    }

    let minDistance = 999;
    for (const enrolledDesc of user.faceDescriptors) {
      const dist = euclideanDistance(descriptor, enrolledDesc);
      if (dist < minDistance) minDistance = dist;
    }

    const threshold = faceSettings.threshold || 0.5;
    const matchPassed = minDistance <= threshold;

    if (!matchPassed) {
      const currentSuspicious = (existing?.suspiciousAttempts || 0) + 1;
      await dataStore.createOrUpdateAttendance({
        user: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        department: req.user.department,
        companyId: req.user.companyId || 'default-company',
        date: todayStr,
        suspiciousAttempts: currentSuspicious,
      });

      await dataStore.logAudit({
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'FACE_SCAN_REJECTED',
        module: 'Attendance',
        details: `Face scan rejected for ${req.user.name}. Distance: ${minDistance.toFixed(3)} (threshold: ${threshold}). Attempt #${currentSuspicious}`,
        ipAddress: req.ip,
      });

      return res.status(401).json({
        success: false,
        message: `Face match failed (confidence distance: ${minDistance.toFixed(2)}, threshold: ${threshold}). ${
          currentSuspicious >= 3 ? 'Multiple failed attempts recorded. You can request an HR attendance correction.' : 'Please try again with clear lighting.'
        }`,
        suspiciousAttempts: currentSuspicious,
        matchScore: minDistance,
      });
    }

    // 7. Calculate status (Present / Late)
    const now = new Date();
    const lateThreshold = settings.workHours?.lateThresholdTime || '09:30';
    const [thHours, thMins] = lateThreshold.split(':').map(Number);
    const checkInHours = now.getHours();
    const checkInMins = now.getMinutes();

    let status = 'Present';
    if (checkInHours > thHours || (checkInHours === thHours && checkInMins > thMins)) {
      status = 'Late';
    }

    const record = await dataStore.createOrUpdateAttendance({
      user: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      department: req.user.department,
      companyId: req.user.companyId || 'default-company',
      date: todayStr,
      checkIn: now,
      status,
      workHours: 0,
      method: 'face',
      matchScore: Math.round(minDistance * 1000) / 1000,
      location: location || null,
      livenessVerified: Boolean(livenessVerified),
      notes: notes || 'Verified via Face Biometric Scan',
    });

    await dataStore.logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CHECK_IN_FACE',
      module: 'Attendance',
      details: `Face biometric check-in verified at ${now.toLocaleTimeString()} (${status}) with match score ${minDistance.toFixed(3)}`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Identity verified! Checked in successfully as ${status}.`,
      attendance: record,
      matchScore: minDistance,
    });
  } catch (error) {
    console.error('[FaceCheckIn Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error during face check-in' });
  }
};


// @desc    Check In for today
// @route   POST /api/attendance/check-in
// @access  Private (All Roles)
const checkIn = async (req, res) => {
  try {
    const todayStr = getTodayDateStr();
    const existing = await dataStore.findAttendanceToday(req.user.id, todayStr);

    if (existing && existing.checkIn) {
      return res.status(400).json({
        success: false,
        message: 'You have already checked in for today!',
        attendance: existing,
      });
    }

    const now = new Date();
    const settings = await dataStore.getSettings();
    const lateThreshold = settings.workHours?.lateThresholdTime || '09:30';
    const [thHours, thMins] = lateThreshold.split(':').map(Number);

    const checkInHours = now.getHours();
    const checkInMins = now.getMinutes();

    let status = 'Present';
    if (checkInHours > thHours || (checkInHours === thHours && checkInMins > thMins)) {
      status = 'Late';
    }

    const record = await dataStore.createOrUpdateAttendance({
      user: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      department: req.user.department,
      date: todayStr,
      checkIn: now,
      status,
      workHours: 0,
    });

    await dataStore.logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CHECK_IN',
      module: 'Attendance',
      details: `Checked in at ${now.toLocaleTimeString()} (${status})`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Checked in successfully as ${status}!`,
      attendance: record,
    });
  } catch (error) {
    console.error('[CheckIn Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Check Out for today
// @route   POST /api/attendance/check-out
// @access  Private (All Roles)
const checkOut = async (req, res) => {
  try {
    const todayStr = getTodayDateStr();
    const existing = await dataStore.findAttendanceToday(req.user.id, todayStr);

    if (!existing || !existing.checkIn) {
      return res.status(400).json({
        success: false,
        message: 'You must check in before checking out!',
      });
    }

    if (existing.checkOut) {
      return res.status(400).json({
        success: false,
        message: 'You have already checked out for today!',
        attendance: existing,
      });
    }

    const checkOutTime = new Date();
    const checkInTime = new Date(existing.checkIn);
    const diffHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
    const workHours = Math.round(diffHours * 10) / 10;

    let status = existing.status;
    if (workHours < 4 && status !== 'Late') {
      status = 'Half-day';
    }

    const updated = await dataStore.createOrUpdateAttendance({
      user: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      department: req.user.department,
      date: todayStr,
      checkIn: existing.checkIn,
      checkOut: checkOutTime,
      status,
      workHours,
    });

    await dataStore.logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CHECK_OUT',
      module: 'Attendance',
      details: `Checked out at ${checkOutTime.toLocaleTimeString()} (${workHours} hrs)`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Checked out successfully! Total: ${workHours} hrs worked.`,
      attendance: updated,
    });
  } catch (error) {
    console.error('[CheckOut Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Get current user's today status
// @route   GET /api/attendance/today
// @access  Private
const getTodayStatus = async (req, res) => {
  try {
    const todayStr = getTodayDateStr();
    const record = await dataStore.findAttendanceToday(req.user.id, todayStr);
    return res.status(200).json({
      success: true,
      date: todayStr,
      attendance: record || null,
    });
  } catch (error) {
    console.error('[GetTodayStatus Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Get current user's attendance history
// @route   GET /api/attendance/my-history
// @access  Private
const getMyAttendance = async (req, res) => {
  try {
    const records = await dataStore.findAttendance({ user: req.user.id });

    // Calculate this week's hours vs 40h
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // Mon = 0
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);

    let weeklyHours = 0;
    let lateCount = 0;

    records.forEach((r) => {
      const rDate = new Date(r.date);
      if (rDate >= monday) {
        weeklyHours += r.workHours || 0;
      }
      if (r.status === 'Late') {
        lateCount++;
      }
    });

    return res.status(200).json({
      success: true,
      records,
      stats: {
        weeklyHours: Math.round(weeklyHours * 10) / 10,
        weeklyTarget: 40,
        lateCount,
        totalDays: records.length,
      },
    });
  } catch (error) {
    console.error('[GetMyAttendance Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Get daily attendance board for HR/Admin
// @route   GET /api/attendance/daily-board
// @access  Private (Admin, HR)
const getDailyBoard = async (req, res) => {
  try {
    const dateStr = req.query.date || getTodayDateStr();
    const allUsers = await dataStore.findUsers({ status: 'Active' });
    const attendanceRecords = await dataStore.findAttendance({ date: dateStr });
    const leaves = await dataStore.findLeaves({ status: 'Approved' });

    const attendanceMap = new Map();
    attendanceRecords.forEach((a) => {
      attendanceMap.set(a.user?.toString() || a.userId?.toString(), a);
    });

    const leaveUserIds = new Set();
    leaves.forEach((l) => {
      if (l.startDate <= dateStr && l.endDate >= dateStr) {
        leaveUserIds.add(l.user?.toString() || l.userId?.toString());
      }
    });

    const board = allUsers.map((u) => {
      const uId = u._id?.toString() || u.id?.toString();
      const att = attendanceMap.get(uId);

      let status = 'Absent';
      if (att) {
        status = att.status;
      } else if (leaveUserIds.has(uId)) {
        status = 'On Leave';
      }

      return {
        userId: uId,
        name: u.name,
        email: u.email,
        employeeId: u.employeeId,
        department: u.department,
        designation: u.designation,
        checkIn: att?.checkIn || null,
        checkOut: att?.checkOut || null,
        workHours: att?.workHours || 0,
        status,
        attendanceId: att?._id || att?.id || null,
      };
    });

    const counts = {
      total: allUsers.length,
      present: board.filter((b) => b.status === 'Present').length,
      late: board.filter((b) => b.status === 'Late').length,
      onLeave: board.filter((b) => b.status === 'On Leave').length,
      absent: board.filter((b) => b.status === 'Absent').length,
    };

    return res.status(200).json({
      success: true,
      date: dateStr,
      counts,
      board,
    });
  } catch (error) {
    console.error('[GetDailyBoard Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Submit attendance correction request
// @route   POST /api/attendance/corrections
// @access  Private (All Roles)
const requestCorrection = async (req, res) => {
  try {
    const { date, requestedCheckIn, requestedCheckOut, reason } = req.body;

    if (!date || !reason) {
      return res.status(400).json({ success: false, message: 'Date and reason are required' });
    }

    let existing = await dataStore.findAttendanceToday(req.user.id, date);
    if (!existing) {
      existing = await dataStore.createOrUpdateAttendance({
        user: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        department: req.user.department,
        date,
        status: 'Absent',
        workHours: 0,
      });
    }

    const correctionData = {
      requested: true,
      requestedCheckIn: requestedCheckIn ? new Date(requestedCheckIn) : new Date(`${date}T09:00:00`),
      requestedCheckOut: requestedCheckOut ? new Date(requestedCheckOut) : new Date(`${date}T18:00:00`),
      reason,
      status: 'Pending',
    };

    existing.correctionRequest = correctionData;
    const updated = await dataStore.createOrUpdateAttendance(existing);

    await dataStore.logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CORRECTION_REQUEST',
      module: 'Attendance',
      details: `Requested correction for date ${date}: ${reason}`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: 'Correction request submitted for review',
      attendance: updated,
    });
  } catch (error) {
    console.error('[RequestCorrection Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Get pending corrections
// @route   GET /api/attendance/corrections
// @access  Private (Admin, HR)
const getPendingCorrections = async (req, res) => {
  try {
    const allAtt = await dataStore.findAttendance();
    const pending = allAtt.filter(
      (a) => a.correctionRequest && a.correctionRequest.requested && a.correctionRequest.status === 'Pending'
    );

    return res.status(200).json({
      success: true,
      count: pending.length,
      corrections: pending,
    });
  } catch (error) {
    console.error('[GetPendingCorrections Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Review/Approve/Reject correction request
// @route   PUT /api/attendance/corrections/:id
// @access  Private (Admin, HR)
const reviewCorrection = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comments } = req.body; // action: 'approve' | 'reject'

    const att = await dataStore.findAttendanceById(id);
    if (!att || !att.correctionRequest) {
      return res.status(404).json({ success: false, message: 'Correction request not found' });
    }

    if (action === 'approve') {
      const newIn = att.correctionRequest.requestedCheckIn || att.checkIn;
      const newOut = att.correctionRequest.requestedCheckOut || att.checkOut;
      const diffHours = newOut && newIn ? (new Date(newOut) - new Date(newIn)) / (1000 * 60 * 60) : 8;

      att.checkIn = newIn;
      att.checkOut = newOut;
      att.workHours = Math.round(diffHours * 10) / 10;
      att.status = 'Present';
      att.correctionRequest.status = 'Approved';
      att.correctionRequest.reviewedBy = req.user.name;
      att.correctionRequest.reviewedAt = new Date();
      att.correctionRequest.reviewComments = comments || 'Approved by HR';
    } else {
      att.correctionRequest.status = 'Rejected';
      att.correctionRequest.reviewedBy = req.user.name;
      att.correctionRequest.reviewedAt = new Date();
      att.correctionRequest.reviewComments = comments || 'Rejected by HR';
    }

    const updated = await dataStore.createOrUpdateAttendance(att);

    await dataStore.logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: action === 'approve' ? 'CORRECTION_APPROVE' : 'CORRECTION_REJECT',
      module: 'Attendance',
      details: `${action === 'approve' ? 'Approved' : 'Rejected'} correction for ${att.userName} on ${att.date}`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Correction request ${action === 'approve' ? 'approved' : 'rejected'}`,
      attendance: updated,
    });
  } catch (error) {
    console.error('[ReviewCorrection Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

module.exports = {
  checkIn,
  faceCheckIn,
  checkOut,
  getTodayStatus,
  getMyAttendance,
  getDailyBoard,
  requestCorrection,
  getPendingCorrections,
  reviewCorrection,
};

