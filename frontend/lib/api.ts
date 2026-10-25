/**
 * MetaGlide HCM Lite - API Client Wrapper
 * Reads NEXT_PUBLIC_API_URL and automatically injects JWT Bearer tokens
 */

const getApiBase = () => {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
};

export const API_BASE = getApiBase();

// Token & Session Storage
export const TOKEN_KEY = 'metaglide_jwt_token';
export const USER_KEY = 'metaglide_user_session';

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setStoredUser = (user: any) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

// Generic Fetch Wrapper
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // If not sending FormData, set Content-Type to application/json
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401 && typeof window !== 'undefined') {
        // Token invalid or expired
        if (!window.location.pathname.startsWith('/login')) {
          removeToken();
          window.location.href = '/login?expired=1';
        }
      }
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return data as T;
  } catch (error: any) {
    console.error(`[API Error] ${endpoint}:`, error.message);
    throw error;
  }
}

// Grouped API Services
export const api = {
  // Auth
  auth: {
    login: (credentials: any) =>
      apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    signup: (userData: any) =>
      apiRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
    getMe: () => apiRequest('/api/auth/me'),
    changePassword: (arg1: any, arg2?: string) => {
      const payload = typeof arg1 === 'object' ? arg1 : { currentPassword: arg1, newPassword: arg2 };
      return apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    health: () => apiRequest('/api/auth/health'),
  },

  // Employees
  employees: {
    list: (params?: { search?: string; department?: string; role?: string; status?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return apiRequest(`/api/employees${q ? `?${q}` : ''}`);
    },
    get360: (id: string) => apiRequest(`/api/employees/${id}/360`),
    // Regular employee creation (self‑service) – still points to the public endpoint
    create: (data: any) =>
      apiRequest('/api/employees', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    // Admin‑only employee creation – uses the new admin endpoint that requires permission
    adminCreate: (data: any) =>
      apiRequest('/api/employees/create', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      apiRequest(`/api/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiRequest(`/api/employees/${id}`, {
        method: 'DELETE',
      }),
    dryRunCSV: (formData: FormData) =>
      apiRequest('/api/employees/import/dry-run', {
        method: 'POST',
        body: formData,
      }),
    commitCSV: (rows: any[]) =>
      apiRequest('/api/employees/import/commit', {
        method: 'POST',
        body: JSON.stringify({ rows }),
      }),
    enrollFace: (id: string, data: { descriptors: number[][]; consentGiven: boolean }) =>
      apiRequest(`/api/employees/${id}/face-enroll`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteFaceData: (id: string) =>
      apiRequest(`/api/employees/${id}/face-data`, {
        method: 'DELETE',
      }),
  },

  // Attendance
  attendance: {
    checkIn: () =>
      apiRequest('/api/attendance/check-in', {
        method: 'POST',
      }),
    faceCheckIn: (data: { descriptor: number[]; livenessVerified: boolean; location?: any; notes?: string }) =>
      apiRequest('/api/attendance/face-check-in', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    checkOut: () =>
      apiRequest('/api/attendance/check-out', {
        method: 'POST',
      }),
    getToday: () => apiRequest('/api/attendance/today'),
    getMyHistory: () => apiRequest('/api/attendance/my-history'),
    getDailyBoard: (date?: string) =>
      apiRequest(`/api/attendance/daily-board${date ? `?date=${date}` : ''}`),
    requestCorrection: (data: any) =>
      apiRequest('/api/attendance/corrections', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getCorrections: () => apiRequest('/api/attendance/corrections'),
    reviewCorrection: (id: string, action: 'approve' | 'reject', comments?: string) =>
      apiRequest(`/api/attendance/corrections/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ action, comments }),
      }),
  },

  // Leave
  leave: {
    apply: (data: any) =>
      apiRequest('/api/leave/apply', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getMyLeaves: () => apiRequest('/api/leave/my-leaves'),
    getAll: (status?: string) =>
      apiRequest(`/api/leave/all${status ? `?status=${status}` : ''}`),
    review: (id: string, status: 'Approved' | 'Rejected', reviewNotes?: string) =>
      apiRequest(`/api/leave/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, reviewNotes }),
      }),
  },

  // Payroll
  payroll: {
    generateDraft: (month: number, year: number) =>
      apiRequest('/api/payroll/draft', {
        method: 'POST',
        body: JSON.stringify({ month, year }),
      }),
    list: () => apiRequest('/api/payroll'),
    getById: (id: string) => apiRequest(`/api/payroll/${id}`),
    finalize: (id: string) =>
      apiRequest(`/api/payroll/${id}/finalize`, {
        method: 'PUT',
      }),
    getMyPayslips: () => apiRequest('/api/payroll/my-payslips'),
    getPayslipDetails: (payrollId: string, userId: string) =>
      apiRequest(`/api/payroll/${payrollId}/payslip/${userId}`),
  },

  // Announcements
  announcements: {
    list: () => apiRequest('/api/announcements'),
    create: (data: any) =>
      apiRequest('/api/announcements', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiRequest(`/api/announcements/${id}`, {
        method: 'DELETE',
      }),
  },

  // Notifications
  notifications: {
    list: () => apiRequest('/api/notifications'),
    markRead: () =>
      apiRequest('/api/notifications/mark-read', {
        method: 'PUT',
      }),
  },

  // Audit Logs
  audit: {
    list: () => apiRequest('/api/audit-logs'),
  },

  // Settings
  settings: {
    get: () => apiRequest('/api/settings'),
    update: (data: any) =>
      apiRequest('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Roles & Permissions
  roles: {
    list: () => apiRequest('/api/roles'),
    getById: (id: string) => apiRequest(`/api/roles/${id}`),
    create: (data: any) =>
      apiRequest('/api/roles', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      apiRequest(`/api/roles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiRequest(`/api/roles/${id}`, {
        method: 'DELETE',
      }),
    duplicate: (id: string) =>
      apiRequest(`/api/roles/${id}/duplicate`, {
        method: 'POST',
      }),
  },

  // AI Assistant
  ai: {
    chat: (messages: any[], forceProvider?: 'gemini' | 'groq') =>
      apiRequest('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages, forceProvider }),
      }),
    dashboardSummary: (kpiData: any) =>
      apiRequest('/api/ai/dashboard-summary', {
        method: 'POST',
        body: JSON.stringify({ kpiData }),
      }),
    smartLeave: (prompt: string) =>
      apiRequest('/api/ai/smart-leave', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      }),
    status: () => apiRequest('/api/ai/status'),
    testFallback: () =>
      apiRequest('/api/ai/test-fallback', {
        method: 'POST',
      }),
    resetCooldown: () =>
      apiRequest('/api/ai/reset-cooldown', {
        method: 'POST',
      }),
  },
};
