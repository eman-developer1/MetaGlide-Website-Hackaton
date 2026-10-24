const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  changePassword,
  healthCheck,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/signup', registerUser);
router.post('/login', loginUser);
router.get('/health', healthCheck);

// Protected routes
router.get('/me', protect, getMe);
router.post('/change-password', protect, changePassword);

module.exports = router;
