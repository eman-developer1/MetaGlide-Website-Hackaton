const dataStore = require('../services/dataStore');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// @desc    Generate Draft Payroll for month & year
// @route   POST /api/payroll/draft
// @access  Private (Admin, HR)
const generateDraftPayroll = async (req, res) => {
  try {
    const { month, year } = req.body;
    const m = Number(month);
    const y = Number(year);

    if (!m || !y || m < 1 || m > 12) {
      return res.status(400).json({ success: false, message: 'Valid month (1-12) and year are required' });
    }

    const existing = await dataStore.findPayrollByMonthYear(m, y);
    if (existing && existing.status === 'Finalized') {
      return res.status(400).json({
        success: false,
        message: `Payroll for ${MONTH_NAMES[m - 1]} ${y} has already been finalized and cannot be regenerated.`,
      });
    }

    const employees = await dataStore.findUsers({ status: 'Active' });
    if (employees.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active employees found to generate payroll.',
      });
    }

    let totalPayrollCost = 0;
    const records = employees.map((emp) => {
      const basic = Number(emp.salary) || 60000;
      const housing = Math.round(basic * 0.15);
      const transport = Math.round(basic * 0.10);
      const medical = Math.round(basic * 0.05);
      const totalAllowances = housing + transport + medical;

      const tax = Math.round(basic * 0.05);
      const insurance = Math.round(basic * 0.02);
      const totalDeductions = tax + insurance;

      const netSalary = basic + totalAllowances - totalDeductions;
      totalPayrollCost += netSalary;

      return {
        user: emp._id || emp.id,
        employeeId: emp.employeeId || 'MG-000',
        name: emp.name,
        email: emp.email,
        department: emp.department || 'General',
        designation: emp.designation || 'Staff',
        basicSalary: basic,
        allowances: {
          housing,
          transport,
          medical,
          bonus: 0,
          total: totalAllowances,
        },
        deductions: {
          tax,
          unpaidLeave: 0,
          insurance,
          total: totalDeductions,
        },
        netSalary,
        paymentStatus: 'Pending',
      };
    });

    const title = `${MONTH_NAMES[m - 1]} ${y} Payroll`;
    const payrollData = {
      month: m,
      year: y,
      title,
      status: 'Draft',
      totalCost: totalPayrollCost,
      totalEmployees: records.length,
      records,
    };

    const payroll = await dataStore.createOrUpdatePayroll(payrollData);

    await dataStore.logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'PAYROLL_DRAFT_GENERATE',
      module: 'Payroll',
      details: `Generated draft payroll for ${title} (${records.length} employees, total: $${totalPayrollCost.toLocaleString()})`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Draft payroll for ${title} generated successfully!`,
      payroll,
    });
  } catch (error) {
    console.error('[GeneratePayroll Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Get all payroll runs
// @route   GET /api/payroll
// @access  Private (Admin, HR)
const getPayrolls = async (req, res) => {
  try {
    const payrolls = await dataStore.findPayrolls();
    const summaries = payrolls.map((p) => ({
      id: p._id || p.id,
      _id: p._id || p.id,
      month: p.month,
      monthName: MONTH_NAMES[p.month - 1],
      year: p.year,
      title: p.title,
      status: p.status,
      totalCost: p.totalCost,
      totalEmployees: p.totalEmployees,
      finalizedBy: p.finalizedBy,
      finalizedAt: p.finalizedAt,
      createdAt: p.createdAt,
    }));

    return res.status(200).json({
      success: true,
      count: summaries.length,
      payrolls: summaries,
    });
  } catch (error) {
    console.error('[GetPayrolls Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Get payroll details by ID
// @route   GET /api/payroll/:id
// @access  Private (Admin, HR)
const getPayrollById = async (req, res) => {
  try {
    const { id } = req.params;
    const payroll = await dataStore.findPayrollById(id);

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    return res.status(200).json({
      success: true,
      payroll,
    });
  } catch (error) {
    console.error('[GetPayrollById Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Finalize payroll (Lock)
// @route   PUT /api/payroll/:id/finalize
// @access  Private (Admin only)
const finalizePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const payroll = await dataStore.findPayrollById(id);

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }

    if (payroll.status === 'Finalized') {
      return res.status(400).json({ success: false, message: 'This payroll run is already finalized' });
    }

    payroll.status = 'Finalized';
    payroll.finalizedBy = req.user.name;
    payroll.finalizedAt = new Date();
    if (payroll.records) {
      payroll.records.forEach((r) => {
        r.paymentStatus = 'Processed';
      });
    }

    const updated = await dataStore.createOrUpdatePayroll(payroll);

    // Broadcast announcement or notification
    await dataStore.createAnnouncement({
      title: `Payroll Finalized: ${payroll.title}`,
      content: `The official payroll for ${payroll.title} has been finalized and payslips are now available in your employee portal.`,
      targetRole: 'All',
      priority: 'Important',
      authorName: req.user.name,
      authorEmail: req.user.email,
    });

    await dataStore.logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'PAYROLL_FINALIZE',
      module: 'Payroll',
      details: `Finalized ${payroll.title} ($${payroll.totalCost?.toLocaleString()})`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Payroll for ${payroll.title} has been successfully finalized!`,
      payroll: updated,
    });
  } catch (error) {
    console.error('[FinalizePayroll Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Get caller's payslips across all finalized payrolls
// @route   GET /api/payroll/my-payslips
// @access  Private (All Roles)
const getMyPayslips = async (req, res) => {
  try {
    const allPayrolls = await dataStore.findPayrolls();
    const myPayslips = [];

    allPayrolls.forEach((p) => {
      // Employees should only see finalized payslips
      if (p.status !== 'Finalized' && req.user.role === 'Employee') return;

      const record = p.records?.find(
        (r) =>
          r.user?.toString() === req.user.id ||
          r.email?.toLowerCase() === req.user.email.toLowerCase()
      );

      if (record) {
        myPayslips.push({
          payrollId: p._id || p.id,
          month: p.month,
          monthName: MONTH_NAMES[p.month - 1],
          year: p.year,
          title: p.title,
          status: p.status,
          finalizedAt: p.finalizedAt,
          record,
        });
      }
    });

    return res.status(200).json({
      success: true,
      payslips: myPayslips,
    });
  } catch (error) {
    console.error('[GetMyPayslips Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Get detailed printable payslip data for a specific employee in a payroll run
// @route   GET /api/payroll/:id/payslip/:userId
// @access  Private (Admin, HR, or Self)
const getPayslipDetails = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const isSelf = req.user.id === userId;
    const isAdminOrHR = req.user.role === 'Admin' || req.user.role === 'HR';

    if (!isSelf && !isAdminOrHR) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only view your own payslip.' });
    }

    const payroll = await dataStore.findPayrollById(id);
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }

    const record = payroll.records?.find(
      (r) => r.user?.toString() === userId || r._id?.toString() === userId
    );

    if (!record) {
      return res.status(404).json({ success: false, message: 'Payslip record not found for this employee' });
    }

    const settings = await dataStore.getSettings();

    return res.status(200).json({
      success: true,
      payslip: {
        company: {
          name: settings.companyName || 'MetaGlide Marketing',
          tagline: settings.tagline || 'Effortless Digital Growth',
          logoUrl: '/logo.png',
          address: 'Suite 400, MetaGlide Tower, Digital Valley',
        },
        period: {
          month: payroll.month,
          monthName: MONTH_NAMES[payroll.month - 1],
          year: payroll.year,
          title: payroll.title,
          status: payroll.status,
          payDate: payroll.finalizedAt || payroll.createdAt,
        },
        employee: {
          id: record.employeeId,
          name: record.name,
          email: record.email,
          department: record.department,
          designation: record.designation,
        },
        earnings: {
          basicSalary: record.basicSalary,
          housingAllowance: record.allowances?.housing || 0,
          transportAllowance: record.allowances?.transport || 0,
          medicalAllowance: record.allowances?.medical || 0,
          bonus: record.allowances?.bonus || 0,
          totalEarnings: (record.basicSalary || 0) + (record.allowances?.total || 0),
        },
        deductions: {
          tax: record.deductions?.tax || 0,
          unpaidLeave: record.deductions?.unpaidLeave || 0,
          insurance: record.deductions?.insurance || 0,
          totalDeductions: record.deductions?.total || 0,
        },
        netPay: record.netSalary,
        paymentStatus: record.paymentStatus,
      },
    });
  } catch (error) {
    console.error('[GetPayslipDetails Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

module.exports = {
  generateDraftPayroll,
  getPayrolls,
  getPayrollById,
  finalizePayroll,
  getMyPayslips,
  getPayslipDetails,
};
