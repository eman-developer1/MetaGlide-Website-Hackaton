const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getEmployees,
  getEmployee360,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  dryRunImportCSV,
  commitImportCSV,
  enrollFace,
  deleteFaceData,
} = require('../controllers/employeeController');
const { protect, authorizeRoles, checkPermission } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Directory listing & individual 360
router.get('/', protect, checkPermission('employees', 'view'), getEmployees);
router.get('/:id/360', protect, getEmployee360);

// Management routes
router.post('/', protect, checkPermission('employees', 'create'), createEmployee);
router.post('/create', protect, checkPermission('employees', 'create'), createEmployee);
router.put('/:id', protect, checkPermission('employees', 'edit'), updateEmployee);
router.delete('/:id', protect, checkPermission('employees', 'delete'), deleteEmployee);

// Face Biometrics Management
router.post('/:id/face-enroll', protect, enrollFace);
router.delete('/:id/face-data', protect, deleteFaceData);

// CSV Import
router.post('/import/dry-run', protect, checkPermission('employees', 'create'), upload.single('file'), dryRunImportCSV);
router.post('/import/commit', protect, checkPermission('employees', 'create'), commitImportCSV);

module.exports = router;
