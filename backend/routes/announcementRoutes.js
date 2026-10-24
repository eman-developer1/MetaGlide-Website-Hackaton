const express = require('express');
const router = express.Router();
const {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} = require('../controllers/announcementController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', protect, getAnnouncements);
router.post('/', protect, authorizeRoles('Admin', 'HR'), createAnnouncement);
router.delete('/:id', protect, authorizeRoles('Admin', 'HR'), deleteAnnouncement);

module.exports = router;
