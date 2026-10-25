const express = require('express');
const router = express.Router();
const { protect, checkPermission, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  duplicateRole,
} = require('../controllers/roleController');

router.use(protect);

router
  .route('/')
  .get(checkPermission('roles', 'view'), getRoles)
  .post(authorizeRoles('Admin'), createRole);

router
  .route('/:id')
  .get(checkPermission('roles', 'view'), getRoleById)
  .put(authorizeRoles('Admin'), updateRole)
  .delete(authorizeRoles('Admin'), deleteRole);

router.post('/:id/duplicate', authorizeRoles('Admin'), duplicateRole);

module.exports = router;
