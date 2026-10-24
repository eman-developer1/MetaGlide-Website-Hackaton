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
} = require('../controllers/employeeController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Directory listing & individual 360
router.get('/', protect, getEmployees);
router.get('/:id/360', protect, getEmployee360);

// Management routes
router.post('/', protect, authorizeRoles('Admin', 'HR'), createEmployee);
router.put('/:id', protect, authorizeRoles('Admin', 'HR'), updateEmployee);
router.delete('/:id', protect, authorizeRoles('Admin'), deleteEmployee);

// CSV Import
router.post('/import/dry-run', protect, authorizeRoles('Admin', 'HR'), upload.single('file'), dryRunImportCSV);
router.post('/import/commit', protect, authorizeRoles('Admin', 'HR'), commitImportCSV);

module.exports = router;
