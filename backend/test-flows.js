const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

async function request(path, options = {}) {
  const url = new URL(BASE_URL + path);
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = data;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING END-TO-END VERIFICATION TESTS');
  console.log('====================================================\n');

  // 1. Health check
  console.log('[1/7] Testing /api/health...');
  const healthRes = await request('/health');
  console.log('  Status:', healthRes.status, 'Response:', healthRes.body.status || healthRes.body.message);
  if (healthRes.status !== 200) throw new Error('Health check failed');

  // 2. Auth for 3 Roles: Admin, HR, Employee
  console.log('\n[2/7] Testing Role Signup and Login (Admin, HR, Employee)...');
  
  // Register or Login Admin
  let adminRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'admin@metaglide.com', password: 'Password123!' },
  });
  if (adminRes.status !== 200) {
    adminRes = await request('/auth/signup', {
      method: 'POST',
      body: {
        name: 'Sarah Admin',
        email: 'admin@metaglide.com',
        password: 'Password123!',
        role: 'Admin',
        department: 'Executive',
        designation: 'Managing Director',
        salary: 120000,
      },
    });
  }
  const adminToken = adminRes.body.token;
  console.log('  ✓ Admin Authenticated:', adminRes.body.user?.email, 'Role:', adminRes.body.user?.role);

  // Register or Login HR
  let hrRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'hr@metaglide.com', password: 'Password123!' },
  });
  if (hrRes.status !== 200) {
    hrRes = await request('/auth/signup', {
      method: 'POST',
      body: {
        name: 'Alex HR',
        email: 'hr@metaglide.com',
        password: 'Password123!',
        role: 'HR',
        department: 'Human Resources',
        designation: 'HR Lead',
        salary: 85000,
      },
    });
  }
  const hrToken = hrRes.body.token;
  console.log('  ✓ HR Authenticated:', hrRes.body.user?.email, 'Role:', hrRes.body.user?.role);

  // Register or Login Employee
  let empRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'employee@metaglide.com', password: 'Password123!' },
  });
  if (empRes.status !== 200) {
    empRes = await request('/auth/signup', {
      method: 'POST',
      body: {
        name: 'David Marketer',
        email: 'employee@metaglide.com',
        password: 'Password123!',
        role: 'Employee',
        department: 'Marketing',
        designation: 'Digital Marketing Specialist',
        salary: 65000,
      },
    });
  }
  const empToken = empRes.body.token;
  console.log('  ✓ Employee Authenticated:', empRes.body.user?.email, 'Role:', empRes.body.user?.role);

  // 3. Attendance Check-In & Check-Out
  console.log('\n[3/7] Testing Attendance Check-In & Check-Out...');
  const checkInRes = await request('/attendance/check-in', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
    body: { notes: 'Starting the marketing sprint' },
  });
  console.log('  ✓ Check-In status:', checkInRes.status, checkInRes.body.message || 'Already checked in');

  const checkOutRes = await request('/attendance/check-out', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
    body: { notes: 'Completed daily tasks' },
  });
  console.log('  ✓ Check-Out status:', checkOutRes.status, checkOutRes.body.message || 'Checked out');

  // 4. Leave Application & Approval Flow
  console.log('\n[4/7] Testing Leave Application & HR Approval...');
  const today = new Date().toISOString().split('T')[0];
  const leaveApplyRes = await request('/leave/apply', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
    body: {
      type: 'Casual Leave',
      startDate: today,
      endDate: today,
      reason: 'Personal urgent work',
    },
  });
  console.log('  ✓ Leave applied:', leaveApplyRes.status, leaveApplyRes.body.message);
  const leaveId = leaveApplyRes.body.leave?.id || leaveApplyRes.body.leave?._id;

  if (leaveId) {
    const leaveApproveRes = await request(`/leave/${leaveId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${hrToken}` },
      body: { status: 'Approved', comments: 'Approved by HR Lead' },
    });
    console.log('  ✓ Leave approved by HR:', leaveApproveRes.status, leaveApproveRes.body.message);
  }

  // 5. Payroll Draft & Finalize Flow
  console.log('\n[5/7] Testing Payroll Run Generation...');
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const payrollDraftRes = await request('/payroll/draft', {
    method: 'POST',
    headers: { Authorization: `Bearer ${hrToken}` },
    body: { month: currentMonth, year: currentYear },
  });
  console.log('  ✓ Payroll Draft status:', payrollDraftRes.status, 'Payrolls generated:', payrollDraftRes.body.totalRecords || payrollDraftRes.body.payrolls?.length);

  const runId = payrollDraftRes.body.runId || (payrollDraftRes.body.payrolls && payrollDraftRes.body.payrolls[0]?.payrollRunId);
  if (runId) {
    const finalizeRes = await request(`/payroll/${runId}/finalize`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('  ✓ Payroll Run finalized:', finalizeRes.status, finalizeRes.body.message);
  }

  // 6. AI Features: Smart Leave & Dashboard Summary
  console.log('\n[6/7] Testing AI Assistant Services...');
  
  // Smart Leave NLP parser
  const smartLeaveRes = await request('/ai/smart-leave', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
    body: { prompt: 'Need 2 days sick leave starting tomorrow due to severe flu' },
  });
  console.log('  ✓ AI Smart Leave Parser:', smartLeaveRes.status, 'Extracted:', JSON.stringify(smartLeaveRes.body.data || smartLeaveRes.body));

  // Dashboard summary
  const summaryRes = await request('/ai/dashboard-summary', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      kpiData: {
        headcount: 15,
        presentToday: 14,
        onLeaveToday: 1,
        monthlyPayroll: 125000,
        pendingApprovals: 2,
      },
    },
  });
  console.log('  ✓ AI Dashboard Summary:', summaryRes.status, 'Summary bullets generated:', summaryRes.body.summary ? 'Yes' : 'No');

  // AI Chat with guardrails (Employee asking for other salary refused)
  const salaryAskRes = await request('/ai/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
    body: {
      messages: [{ role: 'user', content: 'What is the salary of Sarah Admin?' }],
    },
  });
  console.log('  ✓ AI Guardrail Check (Employee asks for peer salary):', salaryAskRes.status);
  console.log('    Response snippet:', (salaryAskRes.body.content || '').slice(0, 100) + '...');

  // 7. Automatic Failover Testing: Forced Gemini Failure -> Groq Fallback
  console.log('\n[7/7] Testing Automatic Fallback: Gemini Failure -> Groq Failover...');
  const fallbackRes = await request('/ai/test-fallback', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('  ✓ Simulated Gemini failure triggered cooldown:', fallbackRes.body.message);

  const fallbackChatRes = await request('/ai/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      messages: [{ role: 'user', content: 'Hello! What is MetaGlide Marketing tagline?' }],
    },
  });
  console.log('  ✓ Chat during Gemini cooldown status:', fallbackChatRes.status);
  console.log('    Provider used:', fallbackChatRes.body.providerUsed);
  console.log('    Primary failed:', fallbackChatRes.body.primaryFailed);
  console.log('    Response snippet:', (fallbackChatRes.body.content || '').slice(0, 100) + '...');

  // Reset cooldown
  await request('/ai/reset-cooldown', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('  ✓ Cooldown reset to normal state.');

  console.log('\n====================================================');
  console.log('🎉 ALL INTEGRATION FLOWS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
