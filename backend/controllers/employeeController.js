const bcrypt = require('bcryptjs');
const dataStore = require('../services/dataStore');

// @desc    Get employee directory with search and filters
// @route   GET /api/employees
// @access  Private (Admin, HR, Employee)
const getEmployees = async (req, res) => {
  try {
    const { search, department, role, status } = req.query;
    let users = await dataStore.findUsers();

    if (search) {
      const q = search.toLowerCase().trim();
      users = users.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.employeeId?.toLowerCase().includes(q) ||
          u.designation?.toLowerCase().includes(q)
      );
    }

    if (department && department !== 'All') {
      users = users.filter((u) => u.department === department);
    }

    if (role && role !== 'All') {
      users = users.filter((u) => u.role === role);
    }

    if (status && status !== 'All') {
      users = users.filter((u) => u.status === status);
    }

    // Role-based data scoping: Employees should not see salaries of other employees!
    const sanitized = users.map((u) => {
      const isSelf = u._id?.toString() === req.user.id || u.id?.toString() === req.user.id;
      const isAdminOrHR = req.user.role === 'Admin' || req.user.role === 'HR';
      return {
        id: u._id || u.id,
        _id: u._id || u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        department: u.department,
        designation: u.designation,
        employeeId: u.employeeId,
        phone: u.phone,
        joinDate: u.joinDate,
        leaveBalance: u.leaveBalance,
        salary: isAdminOrHR || isSelf ? u.salary : undefined,
      };
    });

    return res.status(200).json({
      success: true,
      count: sanitized.length,
      employees: sanitized,
    });
  } catch (error) {
    console.error('[GetEmployees Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Get Employee 360 overview (Profile, Attendance stats, Leaves, Payrolls)
// @route   GET /api/employees/:id/360
// @access  Private (Admin, HR, or Self)
const getEmployee360 = async (req, res) => {
  try {
    const { id } = req.params;
    const isSelf = req.user.id === id || req.user._id === id;
    const isAdminOrHR = req.user.role === 'Admin' || req.user.role === 'HR';

    if (!isSelf && !isAdminOrHR) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only view your own Employee 360 profile.',
      });
    }

    const employee = await dataStore.findUserById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Attendance summary
    const allAtt = await dataStore.findAttendance({ user: employee._id || employee.id });
    const presentCount = allAtt.filter((a) => a.status === 'Present').length;
    const lateCount = allAtt.filter((a) => a.status === 'Late').length;
    const totalHours = allAtt.reduce((sum, a) => sum + (a.workHours || 0), 0);

    // Leaves
    const leaves = await dataStore.findLeaves({ user: employee._id || employee.id });

    // Payrolls (scoped)
    let payrollRecords = [];
    if (isAdminOrHR || isSelf) {
      const allPayrolls = await dataStore.findPayrolls();
      allPayrolls.forEach((pr) => {
        const found = pr.records?.find(
          (r) => r.user?.toString() === id || r.email?.toLowerCase() === employee.email.toLowerCase()
        );
        if (found) {
          payrollRecords.push({
            payrollId: pr._id || pr.id,
            month: pr.month,
            year: pr.year,
            title: pr.title,
            status: pr.status,
            basicSalary: found.basicSalary,
            allowances: found.allowances,
            deductions: found.deductions,
            netSalary: found.netSalary,
          });
        }
      });
    }

    return res.status(200).json({
      success: true,
      employee: {
        id: employee._id || employee.id,
        _id: employee._id || employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        status: employee.status,
        department: employee.department,
        designation: employee.designation,
        employeeId: employee.employeeId,
        phone: employee.phone,
        joinDate: employee.joinDate,
        leaveBalance: employee.leaveBalance,
        salary: isAdminOrHR || isSelf ? employee.salary : undefined,
      },
      stats: {
        totalAttendanceRecorded: allAtt.length,
        presentCount,
        lateCount,
        totalWorkHours: Math.round(totalHours * 10) / 10,
        pendingLeaves: leaves.filter((l) => l.status === 'Pending').length,
        approvedLeaves: leaves.filter((l) => l.status === 'Approved').length,
      },
      recentAttendance: allAtt.slice(0, 10),
      leaves,
      payrollRecords,
    });
  } catch (error) {
    console.error('[GetEmployee360 Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Create a new employee
// @route   POST /api/employees
// @access  Private (Admin, HR)
const createEmployee = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      customRoleId,
      department,
      designation,
      salary,
      phone,
      joinDate,
      status,
      mustChangePassword,
      faceDescriptors,
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await dataStore.findUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Employee with this email already exists' });
    }

    const finalPassword = password || 'MetaGlide@2026';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(finalPassword, salt);

    const allUsers = await dataStore.findUsers();
    const employeeId = `MG-${1000 + allUsers.length + 1}`;

    const newEmp = await dataStore.createUser({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: role || 'Employee',
      customRoleId: customRoleId || null,
      companyId: req.user?.companyId || 'default-company',
      status: status || 'Active',
      department: department?.trim() || null,
      designation: designation?.trim() || null,
      salary: salary !== undefined && salary !== null && salary !== '' ? Number(salary) : null,
      phone: phone?.trim() || '',
      employeeId,
      joinDate: joinDate ? new Date(joinDate) : new Date(),
      leaveBalance: { casual: 10, sick: 10, annual: 14 },
      mustChangePassword: Boolean(mustChangePassword),
      faceDescriptors: Array.isArray(faceDescriptors) && faceDescriptors.length > 0 ? faceDescriptors : [],
      faceEnrolledAt: Array.isArray(faceDescriptors) && faceDescriptors.length > 0 ? new Date() : null,
      faceConsentGiven: Array.isArray(faceDescriptors) && faceDescriptors.length > 0,
    });

    // If department or designation is new, save to settings for future autocomplete
    if (department || designation) {
      try {
        const settings = await dataStore.getSettings();
        const updateObj = {};
        if (department && !settings.departments?.includes(department.trim())) {
          updateObj.departments = [...(settings.departments || []), department.trim()];
        }
        if (designation && !settings.designations?.includes(designation.trim())) {
          updateObj.designations = [...(settings.designations || []), designation.trim()];
        }
        if (Object.keys(updateObj).length > 0) {
          await dataStore.updateSettings(updateObj);
        }
      } catch (e) {
        console.warn('[Auto-add dept/desig warn]:', e.message);
      }
    }

    await dataStore.logAudit({
      userId: req.user.id || req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'EMPLOYEE_CREATE',
      module: 'Employee',
      details: `Created team member ${newEmp.name} (${newEmp.email}) as ${newEmp.role}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      employee: newEmp,
      generatedPassword: !password ? finalPassword : null,
    });
  } catch (error) {
    console.error('[CreateEmployee Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};


// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private (Admin, HR)
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department, designation, role, status, salary, phone } = req.body;

    const emp = await dataStore.findUserById(id);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (department) updateFields.department = department;
    if (designation) updateFields.designation = designation;
    if (role) updateFields.role = role;
    if (status) updateFields.status = status;
    if (salary !== undefined) updateFields.salary = Number(salary);
    if (phone !== undefined) updateFields.phone = phone;

    const updated = await dataStore.updateUser(id, updateFields);

    await dataStore.logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'EMPLOYEE_UPDATE',
      module: 'Employee',
      details: `Updated employee ${emp.name}`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      employee: updated,
    });
  } catch (error) {
    console.error('[UpdateEmployee Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Delete/Deactivate employee
// @route   DELETE /api/employees/:id
// @access  Private (Admin)
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    const emp = await dataStore.findUserById(id);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Soft deactivate or delete
    await dataStore.updateUser(id, { status: 'Inactive' });

    await dataStore.logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'EMPLOYEE_DEACTIVATE',
      module: 'Employee',
      details: `Deactivated employee ${emp.name} (${emp.email})`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: 'Employee status changed to Inactive',
    });
  } catch (error) {
    console.error('[DeleteEmployee Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Dry-run CSV import validation
// @route   POST /api/employees/import/dry-run
// @access  Private (Admin, HR)
const dryRunImportCSV = async (req, res) => {
  try {
    let csvContent = '';
    if (req.file && req.file.buffer) {
      csvContent = req.file.buffer.toString('utf-8');
    } else if (req.body.csvText) {
      csvContent = req.body.csvText;
    } else {
      return res.status(400).json({ success: false, message: 'No CSV file or CSV text uploaded' });
    }

    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ success: false, message: 'CSV must contain a header row and at least one data row' });
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
    const expected = ['name', 'email'];
    for (const exp of expected) {
      if (!headers.includes(exp)) {
        return res.status(400).json({
          success: false,
          message: `Missing required column: '${exp}'. Expected columns: name, email, department, designation, role, salary, phone`,
        });
      }
    }

    const existingUsers = await dataStore.findUsers();
    const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));
    const batchEmails = new Set();

    const validRows = [];
    const invalidRows = [];

    for (let i = 1; i < lines.length; i++) {
      const rawLine = lines[i].trim();
      if (!rawLine) continue;

      const cols = rawLine.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cols[idx] || '';
      });

      const errors = [];
      const { name, email, department, designation, role, salary, phone } = rowObj;

      if (!name) errors.push('Name is required');
      if (!email) {
        errors.push('Email is required');
      } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(email)) {
        errors.push('Invalid email format');
      } else if (existingEmails.has(email.toLowerCase())) {
        errors.push('Email already exists in database');
      } else if (batchEmails.has(email.toLowerCase())) {
        errors.push('Duplicate email inside CSV batch');
      }

      const validRoles = ['Admin', 'HR', 'Employee'];
      const parsedRole = role ? (validRoles.includes(role) ? role : 'Employee') : 'Employee';

      const parsedSalary = salary ? Number(salary) : 60000;
      if (salary && isNaN(parsedSalary)) errors.push('Salary must be a valid number');

      if (errors.length > 0) {
        invalidRows.push({
          rowNumber: i + 1,
          data: rowObj,
          errors,
        });
      } else {
        batchEmails.add(email.toLowerCase());
        validRows.push({
          rowNumber: i + 1,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          role: parsedRole,
          department: department || 'General',
          designation: designation || 'Staff',
          salary: parsedSalary,
          phone: phone || '',
        });
      }
    }

    return res.status(200).json({
      success: true,
      totalRows: lines.length - 1,
      validCount: validRows.length,
      invalidCount: invalidRows.length,
      validRows,
      invalidRows,
    });
  } catch (error) {
    console.error('[DryRun CSV Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error processing CSV' });
  }
};

// @desc    Commit validated rows from CSV import
// @route   POST /api/employees/import/commit
// @access  Private (Admin, HR)
const commitImportCSV = async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid rows provided to commit' });
    }

    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('Welcome@123', salt);
    const existingUsers = await dataStore.findUsers();
    let currentCount = existingUsers.length;

    const createdList = [];
    for (const r of rows) {
      currentCount++;
      const employeeId = `MG-${1000 + currentCount}`;
      const newEmp = await dataStore.createUser({
        name: r.name,
        email: r.email.toLowerCase().trim(),
        password: defaultPassword,
        role: r.role || 'Employee',
        status: 'Active',
        department: r.department || 'General',
        designation: r.designation || 'Staff',
        salary: Number(r.salary) || 60000,
        phone: r.phone || '',
        employeeId,
        joinDate: new Date(),
        leaveBalance: { casual: 10, sick: 10, annual: 14 },
      });
      createdList.push(newEmp);
    }

    await dataStore.logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CSV_IMPORT_COMMIT',
      module: 'Employee',
      details: `Imported ${createdList.length} employees from CSV`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: `Successfully imported ${createdList.length} employees!`,
      count: createdList.length,
    });
  } catch (error) {
    console.error('[Commit CSV Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error committing CSV import' });
  }
};

// @desc    Enroll face biometric descriptors for employee
// @route   POST /api/employees/:id/face-enroll
// @access  Private (Admin, HR, or self)
const enrollFace = async (req, res) => {
  try {
    const { id } = req.params;
    const { descriptors, consentGiven } = req.body;

    if (!descriptors || !Array.isArray(descriptors) || descriptors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid 128-dimensional face descriptor array is required',
      });
    }

    if (!consentGiven) {
      return res.status(400).json({
        success: false,
        message: 'Biometric consent must be accepted before storing face descriptors',
      });
    }

    const emp = await dataStore.findUserById(id);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const updated = await dataStore.updateUser(id, {
      faceDescriptors: descriptors,
      faceEnrolledAt: new Date(),
      faceConsentGiven: true,
    });

    await dataStore.logAudit({
      userId: req.user.id || req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'FACE_ENROLL',
      module: 'Attendance',
      details: `Face descriptors enrolled for ${emp.name}`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Face biometric data successfully enrolled for ${emp.name}`,
      faceEnrolledAt: updated.faceEnrolledAt,
    });
  } catch (error) {
    console.error('[EnrollFace Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to enroll face' });
  }
};

// @desc    Delete face biometric data
// @route   DELETE /api/employees/:id/face-data
// @access  Private (Admin, HR, or self)
const deleteFaceData = async (req, res) => {
  try {
    const { id } = req.params;
    const emp = await dataStore.findUserById(id);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    await dataStore.updateUser(id, {
      faceDescriptors: [],
      faceEnrolledAt: null,
      faceConsentGiven: false,
    });

    await dataStore.logAudit({
      userId: req.user.id || req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'FACE_DELETE',
      module: 'Attendance',
      details: `Face biometric data purged for ${emp.name}`,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Face biometric data cleared for ${emp.name}`,
    });
  } catch (error) {
    console.error('[DeleteFaceData Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete face data' });
  }
};

module.exports = {
  createEmployeeByAdmin: createEmployee,
  getEmployees,
  getEmployee360,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  dryRunImportCSV,
  commitImportCSV,
  enrollFace,
  deleteFaceData,
};

