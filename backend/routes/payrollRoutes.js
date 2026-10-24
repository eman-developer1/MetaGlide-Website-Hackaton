const express = require('express');
const router = express.Router();
const {
  generateDraftPayroll,
  getPayrolls,
  getPayrollById,
  finalizePayroll,
  getMyPayslips,
  getPayslipDetails,
} = require('../controllers/payrollController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Employee payslips
router.get('/my-payslips', protect, getMyPayslips);
router.get('/:id/payslip/:userId', protect, getPayslipDetails);

// Payroll management (Admin & HR)
router.get('/', protect, authorizeRoles('Admin', 'HR'), getPayrolls);
router.get('/:id', protect, authorizeRoles('Admin', 'HR'), getPayrollById);
router.post('/draft', protect, authorizeRoles('Admin', 'HR'), generateDraftPayroll);
router.put('/:id/finalize', protect, authorizeRoles('Admin'), finalizePayroll);

module.exports = router;
