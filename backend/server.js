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
const roleRoutes = require('./routes/roleRoutes');

// Initialize Express App
const app = express();

// Connect to MongoDB
connectDB();

// Dynamic Allowed Origins for CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://meta-glide-website-hackaton-ru2p.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);


app.get('/', (req, res) => {
  res.send('MetaGlide HCM Backend is Running Successfully!');
});

// Permissive CORS for smooth deployment & Vercel connectivity
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like Postman/curl) or allowed origins
      if (!origin || allowedOrigins.includes(origin) || origin.includes('vercel.app')) {
        return callback(null, true);
      }
      return callback(null, true); // Allow all during testing
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve backend public assets
app.use(express.static(path.join(__dirname, 'public')));

// Root Route (To test backend directly in browser)
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MetaGlide HCM Backend is Running Successfully on BotKeep!',
  });
});

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
app.use('/api/roles', roleRoutes);

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

// Explicitly bind to '0.0.0.0' for BotKeep/Cloud Containers
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 MetaGlide HCM Lite Backend Server running on port ${PORT}!`);
  console.log(`🩺 Health Check: http://0.0.0.0:${PORT}/api/health`);
  console.log(`======================================================\n`);
});
// const path = require('path');
// const express = require('express');
// const cors = require('cors');
// const dotenv = require('dotenv');

// // Load environment variables
// dotenv.config();

// // Database configuration
// const { connectDB } = require('./config/db');

// // Import routes
// const authRoutes = require('./routes/authRoutes');
// const employeeRoutes = require('./routes/employeeRoutes');
// const attendanceRoutes = require('./routes/attendanceRoutes');
// const leaveRoutes = require('./routes/leaveRoutes');
// const payrollRoutes = require('./routes/payrollRoutes');
// const announcementRoutes = require('./routes/announcementRoutes');
// const notificationRoutes = require('./routes/notificationRoutes');
// const auditRoutes = require('./routes/auditRoutes');
// const settingsRoutes = require('./routes/settingsRoutes');
// const aiRoutes = require('./routes/aiRoutes');
// const roleRoutes = require('./routes/roleRoutes');

// // Initialize Express App
// const app = express();

// // Connect to MongoDB (with graceful in-memory fallback)
// connectDB();

// // CORS Configuration
// const allowedOrigins = [
//   'https://meta-glide-website-hackaton-ru2p.vercel.app',
//   process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/+$/, '') : null,
//   'http://localhost:3000',
//   'http://127.0.0.1:3000',
// ].filter(Boolean);

// const corsOptions = {
//   origin: (origin, callback) => {
//     // Allow non-browser requests (Postman, curl, server-to-server)
//     if (!origin) return callback(null, true);

//     const isExplicitlyAllowed = allowedOrigins.includes(origin);
//     const isVercelPreview = /^https:\/\/.*\.vercel\.app$/.test(origin);
//     const isDev = process.env.NODE_ENV !== 'production';

//     if (isExplicitlyAllowed || isVercelPreview || isDev) {
//       return callback(null, true);
//     }

//     return callback(null, true); // Graceful fallback
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//   allowedHeaders: [
//     'Content-Type',
//     'Authorization',
//     'X-Requested-With',
//     'Accept',
//     'Origin',
//   ],
//   exposedHeaders: ['Content-Range', 'X-Content-Range'],
//   maxAge: 86400,
// };

// app.use(cors(corsOptions));
// app.options('*', cors(corsOptions));

// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// // Serve backend public assets (e.g. logo)
// app.use(express.static(path.join(__dirname, 'public')));

// // API Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/employees', employeeRoutes);
// app.use('/api/attendance', attendanceRoutes);
// app.use('/api/leave', leaveRoutes);
// app.use('/api/payroll', payrollRoutes);
// app.use('/api/announcements', announcementRoutes);
// app.use('/api/notifications', notificationRoutes);
// app.use('/api/audit-logs', auditRoutes);
// app.use('/api/settings', settingsRoutes);
// app.use('/api/ai', aiRoutes);
// app.use('/api/roles', roleRoutes);

// const { healthCheck } = require('./controllers/authController');

// // Health check endpoint
// app.get('/api/health', healthCheck);

// // Fallback for API 404
// app.use('/api/*', (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
//   });
// });

// // Central Error Handler
// app.use((err, req, res, next) => {
//   console.error('[Unhandled Server Error]:', err.stack);
//   res.status(err.status || 500).json({
//     success: false,
//     message: err.message || 'Internal Server Error',
//   });
// });

// process.on('uncaughtException', (err) => {
//   console.error('[Process Uncaught Exception]:', err.message);
// });

// process.on('unhandledRejection', (reason) => {
//   console.error('[Process Unhandled Rejection]:', reason);
// });

// const PORT = parseInt(process.env.PORT, 10) || 5000;
// const HOST = '0.0.0.0';

// app.listen(PORT, HOST, () => {
//   console.log(`\n======================================================`);
//   console.log(`🚀 MetaGlide HCM Lite Backend Server running!`);
//   console.log(`📡 Listening on:    http://${HOST}:${PORT}`);
//   console.log(`🌐 Public / Dev:    http://localhost:${PORT}`);
//   console.log(`🔐 Auth API:        http://localhost:${PORT}/api/auth`);
//   console.log(`👥 Employees API:   http://localhost:${PORT}/api/employees`);
//   console.log(`⏱️  Attendance API:  http://localhost:${PORT}/api/attendance`);
//   console.log(`🏖️  Leave API:       http://localhost:${PORT}/api/leave`);
//   console.log(`💵 Payroll API:     http://localhost:${PORT}/api/payroll`);
//   console.log(`🤖 AI Assistant:    http://localhost:${PORT}/api/ai`);
//   console.log(`🩺 Health Check:    http://localhost:${PORT}/api/health`);
//   console.log(`======================================================\n`);
// });
