const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Database configuration
const { connectDB } = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const auditRoutes = require('./routes/auditRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Initialize Express App
const app = express();

// Connect to MongoDB (with graceful in-memory fallback)
connectDB();

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev so ports work seamlessly
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve backend public assets (e.g. logo)
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai', aiRoutes);

const { healthCheck } = require('./controllers/authController');

// Health check endpoint
app.get('/api/health', healthCheck);

// Fallback for API 404
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

process.on('uncaughtException', (err) => {
  console.error('[Process Uncaught Exception]:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Process Unhandled Rejection]:', reason);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 MetaGlide HCM Lite Backend Server running!`);
  console.log(`📡 Local URL:       http://localhost:${PORT}`);
  console.log(`🔐 Auth API:        http://localhost:${PORT}/api/auth`);
  console.log(`👥 Employees API:   http://localhost:${PORT}/api/employees`);
  console.log(`⏱️  Attendance API:  http://localhost:${PORT}/api/attendance`);
  console.log(`🏖️  Leave API:       http://localhost:${PORT}/api/leave`);
  console.log(`💵 Payroll API:     http://localhost:${PORT}/api/payroll`);
  console.log(`🤖 AI Assistant:    http://localhost:${PORT}/api/ai`);
  console.log(`🩺 Health Check:    http://localhost:${PORT}/api/health`);
  console.log(`======================================================\n`);
});
