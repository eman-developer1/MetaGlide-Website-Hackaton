const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', protect, getSettings);
router.put('/', protect, authorizeRoles('Admin'), updateSettings);

module.exports = router;
