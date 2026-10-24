# 🌐 MetaGlide Marketing — HCM Lite
### *"Effortless Digital Growth"*
**AI-Assisted Human Capital Management Platform**

---

## 📌 Executive Summary

**MetaGlide HCM Lite** is a Human Capital Management platform featuring:
- **Client Architecture**: Built with **Next.js 16 (App Router)**, **TypeScript**, and **Tailwind CSS**.
- **Server Architecture**: **Node.js Express REST API** with MongoDB persistence and a zero-config in-memory fallback.
- **Dual-Engine AI Intelligence**: **Google Gemini (Primary)** with real-time automatic failover to **Groq (Secondary)**, tool calling, and active cooldown management.
- **Role-Based Access Control**: Strict multi-tenant data-scoping across 3 roles: **Admin**, **HR**, and **Employee**.
- **Branding**: MetaGlide Marketing design system featuring the corporate logo, Raleway typography, and cohesive dark/light mode palettes.

---

## ⚡ Judge Evaluation Quickstart (< 10 Minutes)

Follow these steps to set up and launch both services.

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v22)
- **npm** v9+

---

### 2. Backend Setup & Startup (Port 5000)

```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already installed)
npm install

# Start the Express server
npm start
```
> **Backend runs on**: `http://localhost:5000`
> 
> *Database note*: The backend automatically connects to MongoDB if available. If local MongoDB or Atlas is not configured, it launches with an **in-memory data store fallback**, allowing complete end-to-end evaluation with zero database setup.

---

### 3. Frontend Setup & Startup (Port 3000)

Open a second terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Start Next.js development server
npm run dev
```
> **Frontend runs on**: `http://localhost:3000`

---

## 👥 Roles & Quick Testing Credentials

Per competition rules, **the database starts clean with zero dummy/seed data**.
You can create accounts directly through the Sign-Up tab on the login screen (`http://localhost:3000/login`):

> 💡 **Auto-Promotion Rule**: The very first account registered automatically receives the **Admin** role! Subsequent sign-ups can pick **Admin**, **HR**, or **Employee**.

Recommended initial test accounts to create:
1. **Admin**: `admin@metaglide.com` | Password: `Password123!` (Role: Admin)
2. **HR**: `hr@metaglide.com` | Password: `Password123!` (Role: HR)
3. **Employee**: `employee@metaglide.com` | Password: `Password123!` (Role: Employee)

---

## 🛠️ Automated End-to-End Test Suite

To run the automated verification script covering all flows:

```bash
cd backend
node test-flows.js
```

### Verified Test Results
```
[1/7] Testing /api/health                          --> 200 OK (Server online, in-memory/mongo active)
[2/7] Role Signup and Login (Admin, HR, Employee) --> 200 OK (Tokens issued, role data scoped)
[3/7] Attendance Check-In & Check-Out              --> 200 OK (Timestamps recorded, status computed)
[4/7] Leave Application & HR Approval Flow         --> 201 Created & 200 OK (Balances adjusted)
[5/7] Payroll Run Generation & Finalization        --> 200 OK (Gross, deductions & net calculated)
[6/7] AI Assistant & Guardrails                    --> 200 OK (Smart-leave NLP, salary privacy guardrail)
[7/7] Gemini Quota Failure -> Groq Failover Test   --> 200 OK (Seamless failover with cooldown)
```

---

## 🚀 Key Modules & Capabilities

| Module | Description | Key Features |
|---|---|---|
| **1. Auth & Access** | JWT authentication with role authorization | Password strength meter, remember-me, role guards, password changes |
| **2. Role Dashboards** | Custom dashboards per role | **Admin**: Headcount, attrition, payroll cost, audit stream. **HR**: Attendance trends, late-comers, pending approvals. **Employee**: Hours worked, check-in, leave balances. |
| **3. Employee Directory** | Directory & Employee 360 profiles | Search, department filters, modal profile viewer, CSV import with dry-run validation |
| **4. Attendance** | Real-time tracking and logging | Daily attendance board, 1-click check-in/out, correction requests with HR review |
| **5. Leave Management** | Time-off requests and tracking | Balance tracker (casual, sick, annual), HR approval inbox, **Smart Leave NLP parser** |
| **6. Payroll Lite** | Salary runs & payslip generation | Automated monthly payroll runs, allowance/deduction breakdown, printable PDF payslip |
| **7. Announcements** | Company communications | Priority labeling (urgent, high, normal), department targeting, read tracking |
| **8. Audit & Compliance**| System event monitoring | Immutable audit trail logging actor, action, IP address, and payload diffs |
| **9. Dual AI Assistant** | Floating conversational drawer | Gemini primary + Groq fallback, tool calling, markdown formatting, rate limiting |

---

## 🤖 Dual-Engine AI Architecture (Gemini + Groq)

```
                       +-----------------------+
                       | User AI Chat Request  |
                       +-----------+-----------+
                                   |
                     +-------------v-------------+
                     | Hourly Rate Limit Guard  |
                     +-------------+-------------+
                                   |
                     +-------------v-------------+
                     | Is Gemini On Cooldown?    |
                     +------+-------------+------+
                       YES  |             | NO
             +--------------+             +--------------+
             |                                           |
             v                                           v
   +-------------------+                       +-------------------+
   |   Provider 2:     |                       |   Provider 1:     |
   |   Groq (Fallback) |                       |   Google Gemini   |
   +---------+---------+                       +---------+---------+
             |                                           |
             |                                 Success?  |  Failed / 429 / 5xx?
             |                                     +-----+-----+
             |                                     |           |
             |                                     v           v
             |                              Return Result  Activate 10m Cooldown
             |                                                 |
             +<------------------------------------------------+
             |
             v
+-----------------------------+
| Same History & Tool Calling |
| Returned with Engine Badge  |
+-----------------------------+
```

### AI Resilience Features
1. **Primary Engine**: Google Gemini (`gemini-2.5-flash`).
2. **Fallback Engine**: Groq Cloud (`llama-3.3-70b-versatile`).
3. **Failover Trigger**: Any HTTP 429 quota exhaustion, timeout, or 5xx error on Gemini triggers automatic retry with Groq using identical conversation history.
4. **Active Cooldown**: Gemini is placed on a 10-minute cooldown after exhaustion to prevent wasted requests; subsequent chats route directly to Groq.
5. **Tool Calling**: Tool calling works on both providers (`get_headcount`, `get_attendance_summary`, `get_late_comers`, `get_leave_summary`, `get_my_leave_balance`, `get_payroll_summary`, `search_employees`).
6. **Privacy Guardrails**: Employees inquiring about peers' salaries are politely refused.

---

## 🎨 Branding & Design System

- **Corporate Identity**: MetaGlide Marketing ("Effortless Digital Growth")
- **Typography**: Google Font **Raleway** (`weights: 400, 500, 600, 700, 800`)
- **Logo**: `/frontend/public/logo.png`
- **Palette**:
  - `--navy`: `#12213F` (Deep Slate Navy)
  - `--blue`: `#0A66C2` (Electric Blue Primary)
  - `--sky`: `#10AEE6` (Sky Blue Accent)
  - `--cyan`: `#1DE0FF` (Cyan Gradient Focus)
  - `--bg`: `#F7FAFC` / Dark Mode `#0B132B`
  - `--card`: `#FFFFFF` / Dark Mode `#12213F`
  - `--border`: `#E3EAF2` / Dark Mode `#1E2D4A`

---

## 📝 Change Log & Fixed Issues

### What Was Added
- **Complete Next.js App Router Frontend**: Rebuilt the frontend in TypeScript, Tailwind CSS, and Lucide icons.
- **11 Dedicated Application Views**:
  - `/login` — Split-screen branding, tabs for sign in/up, forgot password modal.
  - `/dashboard` — Role-specific dynamic KPIs, quick actions, and recent activity feeds.
  - `/employees` — Searchable employee grid with Employee 360 view and CSV import with dry run.
  - `/attendance` — Daily attendance board, check-in widget, and correction request management.
  - `/leave` — Leave balances, application form, HR approval inbox, and Smart Leave NLP parser.
  - `/payroll` — Monthly payroll draft generation, finalization, and printable payslip viewer.
  - `/announcements` — Targeted corporate announcements board with priority badges.
  - `/notifications` — Real-time notification feed with read tracking and filters.
  - `/audit-log` — Chronological compliance log with module filters and IP addresses.
  - `/settings` — Company branding preferences, password change form, and system info.
  - `AIChatPanel` — Global floating conversational drawer with model badge and role-based prompt suggestions.
- **Dual-Engine AI Service**: Complete backend orchestration (`backend/services/ai/`) integrating Gemini and Groq with shared tool schemas and cooldown management.
- **In-Memory Graceful Fallback**: Comprehensive fallback store ensuring all features function even when an external MongoDB connection is unavailable.

### What Was Removed
- Legacy plain static HTML, CSS, and JS frontend files.
- Hardcoded test credentials.

### Bugs Fixed
1. **Static Prerender Timing Bug**: Resolved Next.js 16 build crash where `new Date()` evaluated during component initialization by deferring date reads to `useEffect`.
2. **Toast Context Provider Scope**: Wrapped Next.js `RootLayout` with a global `Providers` component so all pages can access `useToast()` without runtime exceptions.
3. **Health Check 302 Redirect**: Fixed `/api/health` returning an HTTP 302 redirect by binding the `healthCheck` controller directly to the endpoint.
4. **Attendance Calculation Precision**: Fixed check-out duration calculation in `attendanceController.js` to handle cross-hour rounding accurately.
