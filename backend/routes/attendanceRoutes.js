const express = require('express');
const router = express.Router();
const {
  checkIn,
  faceCheckIn,
  checkOut,
  getTodayStatus,
  getMyAttendance,
  getDailyBoard,
  requestCorrection,
  getPendingCorrections,
  reviewCorrection,
} = require('../controllers/attendanceController');
const { protect, authorizeRoles, checkPermission } = require('../middleware/authMiddleware');

// Employee actions
router.post('/check-in', protect, checkIn);
router.post('/face-check-in', protect, faceCheckIn);
router.post('/check-out', protect, checkOut);
router.get('/today', protect, getTodayStatus);
router.get('/my-history', protect, getMyAttendance);
router.post('/corrections', protect, requestCorrection);

// Admin & HR actions
router.get('/daily-board', protect, checkPermission('attendance', 'view'), getDailyBoard);
router.get('/corrections', protect, checkPermission('attendance', 'approve'), getPendingCorrections);
router.put('/corrections/:id', protect, checkPermission('attendance', 'approve'), reviewCorrection);

module.exports = router;
