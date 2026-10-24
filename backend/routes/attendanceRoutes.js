const express = require('express');
const router = express.Router();
const {
  checkIn,
  checkOut,
  getTodayStatus,
  getMyAttendance,
  getDailyBoard,
  requestCorrection,
  getPendingCorrections,
  reviewCorrection,
} = require('../controllers/attendanceController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Employee actions
router.post('/check-in', protect, checkIn);
router.post('/check-out', protect, checkOut);
router.get('/today', protect, getTodayStatus);
router.get('/my-history', protect, getMyAttendance);
router.post('/corrections', protect, requestCorrection);

// Admin & HR actions
router.get('/daily-board', protect, authorizeRoles('Admin', 'HR'), getDailyBoard);
router.get('/corrections', protect, authorizeRoles('Admin', 'HR'), getPendingCorrections);
router.put('/corrections/:id', protect, authorizeRoles('Admin', 'HR'), reviewCorrection);

module.exports = router;
