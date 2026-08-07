// MUST be first — Sentry's auto-instrumentation patches modules at require time
require('./instrument');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const Sentry = require('@sentry/node');
const bodyParser = require("body-parser");
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
const { processMonthlyReminders } = require('./controllers/reminderController');
const { authenticateToken } = require('./middleware/adminAuth');

dotenv.config();
const app = express();

// ====================================================================
// LOGGING SETUP: Write to both console and logs/requests.log
// ====================================================================
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Rolling log file — new file each day: logs/requests-2026-03-03.log
function getDailyLogStream() {
  const today = new Date().toISOString().slice(0, 10); // "2026-03-03"
  const logFile = path.join(logsDir, `requests-${today}.log`);
  return fs.createWriteStream(logFile, { flags: 'a' });
}

// Custom morgan token: request body (truncated to 200 chars for safety)
morgan.token('body', (req) => {
  if (!req.body || Object.keys(req.body).length === 0) return '-';
  try {
    const bodyStr = JSON.stringify(req.body);
    // Mask sensitive fields (case-insensitive). Covers password, token, secret,
    // OTP, UPI/phone numbers, transaction IDs, JWT, API keys.
    const SENSITIVE_KEY = /"(password|password_hash|passwordHash|pwd|token|access_token|refresh_token|jwt|secret|api_?key|otp|pin|upi_?phone(_?number)?|phone(_?number)?2?|transaction_?id|payment_transaction_id|aadhaar|pan|account_?number|cvv)"\s*:\s*"[^"]*"/gi;
    const masked = bodyStr.replace(SENSITIVE_KEY, (m, k) => `"${k}":"****"`);
    return masked.length > 200 ? masked.slice(0, 200) + '...' : masked;
  } catch {
    return '-';
  }
});

// Custom morgan token: client real IP (works behind proxy)
morgan.token('client-ip', (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket.remoteAddress
    || '-';
});

// Log format:
// [2026-03-03T10:22:01.123Z] POST /api/auth/login | IP: 192.168.1.5 | Status: 200 | 34ms | Body: {"username":"admin"}
const LOG_FORMAT = '[:date[iso]] :method :url | IP: :client-ip | Status: :status | :response-time ms | Body: :body';

// 1. Console logger (colorized via morgan dev for readability)
app.use(morgan('dev'));

// 2. File logger (detailed format, appends to daily log file)
app.use(morgan(LOG_FORMAT, {
  stream: {
    write: (message) => {
      const stream = getDailyLogStream();
      stream.write(message);
      stream.end();
    }
  }
}));

// Enable trust proxy
app.set("trust proxy", 1);

// ====================================================================
// DEBUG LOGGING: Extra detail for non-standard requests
// ====================================================================
app.use((req, res, next) => {
  // Log full headers for debugging when needed (uncomment below)
  // console.log('Headers:', req.headers);

  if (req.headers['user-agent']?.includes('Chrome/144')) {
    const msg = `[${new Date().toISOString()}] ⚠ Detected Chromium 144 Request — ${req.method} ${req.url}`;
    console.log(msg);
    const stream = getDailyLogStream();
    stream.write(msg + '\n');
    stream.end();
  }
  next();
});

// ====================================================================
// SECURITY FIX: Secure CORS Configuration
// ====================================================================
// Allowlist is an exact-match set of full origins (scheme + host + port).
// In dev, localhost on any port is allowed. In prod, set ALLOWED_ORIGINS env var.
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean),
);

const corsOptions = {
  origin: function (origin, callback) {
    // No Origin header → non-browser caller (curl, server-to-server). Allowed only
    // because every sensitive route is now JWT-gated; CORS isn't the auth boundary.
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.has(origin)) return callback(null, true);

    // Dev convenience: any localhost port over http(s)
    if (process.env.NODE_ENV !== 'production' &&
        /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    const msg = `[${new Date().toISOString()}] 🚫 CORS BLOCKED — Origin: ${origin}`;
    console.warn(msg);
    const stream = getDailyLogStream();
    stream.write(msg + '\n');
    stream.end();
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// ====================================================================
// SECURITY FIX: HTTPS Enforcement in Production
// ====================================================================
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      next();
    } else {
      res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
  });
}

app.use(express.json());
app.use(bodyParser.json({ limit: "1mb" }));
app.use(bodyParser.urlencoded({ limit: "1mb", extended: true }));

// ====================================================================
// SECURITY FIX: Enhanced Helmet.js Configuration
// ====================================================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true
}));

app.use(require('./middleware/auditLogger'));

// ====================================================================
// Health check — public returns only {status, db}; full DB config requires admin JWT
// ====================================================================
app.get('/api/health', async (req, res) => {
  try {
    const { executeQuery } = require('./models/db');
    await executeQuery('SELECT 1');

    // Try to decode an admin token; if present + valid + role=admin, return details.
    let detailed = false;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.role === 'admin') detailed = true;
      } catch (_) { /* ignore — public response */ }
    }

    if (detailed) {
      const { dbConfig } = require('./config/database');
      return res.json({
        status: 'OK',
        db: 'Connected',
        config: {
          server: dbConfig.server,
          database: dbConfig.database,
          user: dbConfig.user,
          port: dbConfig.port,
          options: dbConfig.options,
        },
        timestamp: new Date(),
      });
    }
    res.json({ status: 'OK', db: 'Connected' });
  } catch (error) {
    console.error('Health Check Error:', error);
    res.status(500).json({ status: 'Error', db: 'Disconnected' });
  }
});

// ====================================================================
// API Routes — every sensitive router requires a valid JWT.
// `/api/auth` is the only public router. State/district lookup are reference
// data but kept behind auth so an attacker can't enumerate them.
// ====================================================================
// Brute-force protection for the login endpoint.
// 50 attempts per IP per 15 minutes — comfortable for a small team that
// shares an office NAT (everyone exits with the same public IP) while still
// far below what a brute-force script would need.
// Successful logins are NOT counted, so a single user re-logging-in many
// times in a day doesn't burn through the budget.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many failed login attempts. Try again in 15 minutes.' },
});
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/dashboard', authenticateToken, require('./routes/dashboard'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/schemes', authenticateToken, require('./routes/schemes'));
app.use('/api/payments', authenticateToken, require('./routes/payments'));
app.use('/api/exports', authenticateToken, require('./routes/exports'));
app.use('/api/states', authenticateToken, require('./routes/states'));
app.use('/api/districts', authenticateToken, require('./routes/districts'));
app.use('/api/order-tracking', authenticateToken, require('./routes/orderTracking'));
app.use('/api/transporters', authenticateToken, require('./routes/transporters'));
app.use('/api/auctions', authenticateToken, require('./routes/auctions'));
app.use('/api/winners', authenticateToken, require('./routes/winners'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/reminders', require('./routes/reminders'));

// ====================================================================
// Error Handlers
// ====================================================================
// Sentry's express error handler — captures unhandled errors from any route.
// No-op when SENTRY_DSN is unset.
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// JSON Parsing Error (400)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    const msg = `[${new Date().toISOString()}] ❌ JSON Parse Error — ${req.method} ${req.url} — ${err.message}`;
    console.error(msg);
    const stream = getDailyLogStream();
    stream.write(msg + '\n');
    stream.end();
    return res.status(400).json({
      error: 'Malformed JSON payload',
      details: err.message,
      tip: 'Check for trailing commas or unescaped characters'
    });
  }
  next(err);
});

// 404 handler
app.use((req, res) => {
  const msg = `[${new Date().toISOString()}] 🔍 404 Not Found — ${req.method} ${req.originalUrl}`;
  console.warn(msg);
  const stream = getDailyLogStream();
  stream.write(msg + '\n');
  stream.end();
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// ====================================================================
// START SERVERs
// ====================================================================
const PORT = process.env.PORT || 5011;
app.listen(PORT, () => {
  console.log(`\n🚀 Server: http://localhost:${PORT}`);
  console.log(`✅ Health: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Login: POST http://localhost:${PORT}/api/auth/login`);
  console.log(`👤 Users: http://localhost:${PORT}/api/users`);
  console.log(`👥 Customers: http://localhost:${PORT}/api/customers`);
  console.log(`📋 Schemes: http://localhost:${PORT}/api/schemes`);
  console.log(`💰 Payments: http://localhost:${PORT}/api/payments`);
  console.log(`🌍 States: http://localhost:${PORT}/api/states`);
  console.log(`🏘️  Districts: http://localhost:${PORT}/api/districts`);
  console.log(`🚚 Transporters: http://localhost:${PORT}/api/transporters`);
  console.log(`📥 Exports: http://localhost:${PORT}/api/exports`);
  console.log(`📝 Logs: ${logsDir}`);

  // ====================================================================
  // CRON JOB: Automated Payment Reminders (1st of every month at 00:00 IST)
  // IST is UTC +5:30. 00:00 IST is 18:30 UTC (previous day).
  // node-cron supports timezone option.
  // ====================================================================
  cron.schedule('0 0 1 * *', async () => {
    console.log('[Cron] ⏰ Running automated monthly reminders...');
    try {
      const result = await processMonthlyReminders();
      console.log(`[Cron] ✅ Reminders complete. Success: ${result.success}, Failed: ${result.failed}`);
    } catch (err) {
      console.error('[Cron] ❌ Automated Reminders Error:', err.message);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
});

module.exports = app;
