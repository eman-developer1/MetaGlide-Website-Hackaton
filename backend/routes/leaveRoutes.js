const express = require('express');
const router = express.Router();
const {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  reviewLeave,
} = require('../controllers/leaveController');
const { protect, authorizeRoles, checkPermission } = require('../middleware/authMiddleware');

router.post('/apply', protect, applyLeave);
router.get('/my-leaves', protect, getMyLeaves);
router.get('/all', protect, checkPermission('leave', 'view'), getAllLeaves);
router.put('/:id/status', protect, checkPermission('leave', 'approve'), reviewLeave);

module.exports = router;
