const dataStore = require('../dataStore');

// Common Tool Definitions
const toolDefinitions = [
  {
    name: 'get_headcount',
    description: 'Get total headcount of active employees and breakdown by department.',
    parameters: {
      type: 'object',
      properties: {
        department: {
          type: 'string',
          description: 'Optional department name to filter by.',
        },
      },
    },
  },
  {
    name: 'get_attendance_summary',
    description: "Get today's or a specific date's attendance summary (total, present, late, on leave, absent).",
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format (defaults to today if omitted).',
        },
      },
    },
  },
  {
    name: 'get_late_comers',
    description: 'Get list of employees who checked in late today or on a specific date.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format (defaults to today if omitted).',
        },
      },
    },
  },
  {
    name: 'get_leave_summary',
    description: 'Get summary of leave requests including pending approvals and approved count.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['Pending', 'Approved', 'Rejected', 'All'],
          description: 'Filter by leave status.',
        },
      },
    },
  },
  {
    name: 'get_my_leave_balance',
    description: "Get the calling user's current leave balances for Casual, Sick, and Annual leaves.",
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_payroll_summary',
    description: 'Get the latest monthly payroll cost, status (Draft/Finalized), and total employees paid. Restricted to Admin and HR.',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'number', description: 'Month number 1-12' },
        year: { type: 'number', description: 'Year e.g. 2026' },
      },
    },
  },
  {
    name: 'search_employees',
    description: 'Search employees by name, department, designation, or employee code.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search term or employee name.',
        },
        department: {
          type: 'string',
          description: 'Optional department filter.',
        },
      },
      required: ['query'],
    },
  },
];

// Adapter for Gemini function declarations format
const getGeminiFunctionDeclarations = () => {
  return toolDefinitions.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: {
      type: 'OBJECT',
      properties: Object.entries(t.parameters.properties || {}).reduce((acc, [k, v]) => {
        acc[k] = {
          type: v.type.toUpperCase(),
          description: v.description,
          ...(v.enum ? { enum: v.enum } : {}),
        };
        return acc;
      }, {}),
      required: t.parameters.required || [],
    },
  }));
};

// Adapter for Groq / OpenAI tools format
const getGroqTools = () => {
  return toolDefinitions.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
};

// Execute Tool with Caller Context and Permission Guardrails
const executeTool = async (name, args = {}, caller) => {
  try {
    switch (name) {
      case 'get_headcount': {
        const users = await dataStore.findUsers({ status: 'Active' });
        const byDept = {};
        users.forEach((u) => {
          const dept = u.department || 'General';
          byDept[dept] = (byDept[dept] || 0) + 1;
        });

        if (args.department && args.department !== 'All') {
          return {
            totalInDepartment: byDept[args.department] || 0,
            department: args.department,
          };
        }

        return {
          totalActiveHeadcount: users.length,
          departmentBreakdown: byDept,
        };
      }

      case 'get_attendance_summary': {
        const todayStr = args.date || new Date().toISOString().split('T')[0];
        const allUsers = await dataStore.findUsers({ status: 'Active' });
        const attRecords = await dataStore.findAttendance({ date: todayStr });
        const leaves = await dataStore.findLeaves({ status: 'Approved' });

        const onLeaveCount = leaves.filter((l) => l.startDate <= todayStr && l.endDate >= todayStr).length;
        const presentCount = attRecords.filter((a) => a.status === 'Present').length;
        const lateCount = attRecords.filter((a) => a.status === 'Late').length;
        const recordedCount = attRecords.length;
        const absentCount = Math.max(0, allUsers.length - recordedCount - onLeaveCount);

        return {
          date: todayStr,
          totalEmployees: allUsers.length,
          present: presentCount,
          late: lateCount,
          onLeave: onLeaveCount,
          absent: absentCount,
        };
      }

      case 'get_late_comers': {
        const targetDate = args.date || new Date().toISOString().split('T')[0];
        const attRecords = await dataStore.findAttendance({ date: targetDate });
        const lateList = attRecords
          .filter((a) => a.status === 'Late')
          .map((a) => ({
            name: a.userName,
            department: a.department,
            checkIn: a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : 'N/A',
          }));

        return {
          date: targetDate,
          count: lateList.length,
          lateEmployees: lateList,
        };
      }

      case 'get_leave_summary': {
        const query = args.status && args.status !== 'All' ? { status: args.status } : {};
        const leaves = await dataStore.findLeaves(query);
        return {
          totalLeavesQueried: leaves.length,
          pendingApprovals: leaves.filter((l) => l.status === 'Pending').length,
          approved: leaves.filter((l) => l.status === 'Approved').length,
          recentRequests: leaves.slice(0, 5).map((l) => ({
            employee: l.userName,
            type: l.type,
            days: l.days,
            startDate: l.startDate,
            endDate: l.endDate,
            status: l.status,
          })),
        };
      }

      case 'get_my_leave_balance': {
        const user = await dataStore.findUserById(caller.id);
        return {
          employeeName: user?.name,
          leaveBalance: user?.leaveBalance || { casual: 10, sick: 10, annual: 14 },
        };
      }

      case 'get_payroll_summary': {
        // Enforce Server-Side RBAC Guardrail
        if (caller.role !== 'Admin' && caller.role !== 'HR') {
          return {
            error: 'Permission Denied: Only Admin and HR roles can query organizational payroll summaries.',
          };
        }

        const payrolls = await dataStore.findPayrolls();
        if (payrolls.length === 0) {
          return { message: 'No payroll runs recorded yet.' };
        }

        let selected = payrolls[0];
        if (args.month && args.year) {
          selected = payrolls.find((p) => p.month === Number(args.month) && p.year === Number(args.year)) || selected;
        }

        return {
          payrollTitle: selected.title,
          status: selected.status,
          totalCost: selected.totalCost,
          totalEmployees: selected.totalEmployees,
          finalizedBy: selected.finalizedBy || 'Pending finalization',
        };
      }

      case 'search_employees': {
        const q = (args.query || '').toLowerCase().trim();
        const users = await dataStore.findUsers({ status: 'Active' });
        const matches = users.filter((u) => {
          const matchQuery =
            !q ||
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            u.employeeId?.toLowerCase().includes(q) ||
            u.designation?.toLowerCase().includes(q);
          const matchDept = !args.department || u.department === args.department;
          return matchQuery && matchDept;
        });

        // Scope salaries: hide from Employee role
        const isPrivileged = caller.role === 'Admin' || caller.role === 'HR';
        return {
          resultsCount: matches.length,
          employees: matches.slice(0, 10).map((u) => ({
            name: u.name,
            email: u.email,
            employeeId: u.employeeId,
            department: u.department,
            designation: u.designation,
            role: u.role,
            salary: isPrivileged || u._id?.toString() === caller.id ? u.salary : '[Restricted]',
          })),
        };
      }

      default:
        return { error: `Tool ${name} is not recognized.` };
    }
  } catch (err) {
    console.error(`[Tool Execution Error: ${name}]:`, err);
    return { error: `Failed to execute tool ${name}: ${err.message}` };
  }
};

module.exports = {
  toolDefinitions,
  getGeminiFunctionDeclarations,
  getGroqTools,
  executeTool,
};
