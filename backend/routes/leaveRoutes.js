const express = require('express');
const router = express.Router();
const {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  reviewLeave,
} = require('../controllers/leaveController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/apply', protect, applyLeave);
router.get('/my-leaves', protect, getMyLeaves);
router.get('/all', protect, authorizeRoles('Admin', 'HR'), getAllLeaves);
router.put('/:id/status', protect, authorizeRoles('Admin', 'HR'), reviewLeave);

module.exports = router;
