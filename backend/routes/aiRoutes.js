const express = require('express');
const router = express.Router();
const {
  chatWithAI,
  getDashboardSummary,
  smartLeave,
  getAIStatus,
  testFallback,
  resetAICooldown,
} = require('../controllers/aiController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/chat', protect, chatWithAI);
router.post('/dashboard-summary', protect, getDashboardSummary);
router.post('/smart-leave', protect, smartLeave);
router.get('/status', protect, getAIStatus);

// Testing & Cooldown controls for Admin
router.post('/test-fallback', protect, authorizeRoles('Admin'), testFallback);
router.post('/reset-cooldown', protect, authorizeRoles('Admin'), resetAICooldown);

module.exports = router;
