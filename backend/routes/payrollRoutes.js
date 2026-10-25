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
const { protect, authorizeRoles, checkPermission } = require('../middleware/authMiddleware');

// Employee payslips
router.get('/my-payslips', protect, getMyPayslips);
router.get('/:id/payslip/:userId', protect, getPayslipDetails);

// Payroll management (Admin & HR)
router.get('/', protect, checkPermission('payroll', 'view'), getPayrolls);
router.get('/:id', protect, checkPermission('payroll', 'view'), getPayrollById);
router.post('/draft', protect, checkPermission('payroll', 'create'), generateDraftPayroll);
router.put('/:id/finalize', protect, checkPermission('payroll', 'approve'), finalizePayroll);

module.exports = router;
