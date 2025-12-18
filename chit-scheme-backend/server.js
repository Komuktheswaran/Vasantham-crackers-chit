const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

const bodyParser = require("body-parser");
const morgan = require('morgan');

dotenv.config();
const app = express();

// Enable trust proxy for rate limiting behind proxies (e.g., Heroku, Nginx, or local dev)
app.set("trust proxy", 1);

// ====================================================================
// SECURITY FIX: Secure CORS Configuration
// ====================================================================
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'https://103.38.50.149:3000'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
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
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true
}));

app.use(morgan('combined')); // Log HTTP requests
app.use(require('./middleware/auditLogger')); // Audit Log for operations

// ====================================================================
// SECURITY FIX: Effective Rate Limiting
// ====================================================================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes (FIXED TYPO: was 10000)
  max: 100, // Limit each IP to 100 requests per 15 minutes (was 1000)
  message: 'Too many requests from this IP, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || 
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.socket?.remoteAddress || 
           'unknown';
  },
});
app.use("/api/", limiter);

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per 15 minutes (was 10000!)
  message: "Too many login attempts from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  keyGenerator: (req) => {
    return req.ip || 
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.socket?.remoteAddress || 
           'unknown';
  },
});
app.use('/api/auth/', authLimiter);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const { executeQuery } = require('./models/db');
    const { dbConfig } = require('./config/database');
    
    // Log the configuration to the console for debugging
    console.log('🔍 Database Configuration:', {
      ...dbConfig,
      password: dbConfig.password ? '****' : 'NOT_SET'
    });

    await executeQuery('SELECT 1');
    
    // Return safe config in response
    const safeConfig = {
      server: dbConfig.server,
      database: dbConfig.database,
      user: dbConfig.user,
      port: dbConfig.port,
      options: dbConfig.options
    };

    res.json({ 
      status: 'OK', 
      db: 'Connected', 
      config: safeConfig,
      timestamp: new Date() 
    });
  } catch (error) {
    console.error('Health Check Error:', error);
    const { dbConfig } = require('./config/database');
    res.status(500).json({ 
      status: 'Error', 
      db: 'Disconnected', 
      error: error.message,
      configUsed: {
        server: dbConfig?.server,
        user: dbConfig?.user,
        port: dbConfig?.port
      } 
    });
  }
});

// API Routes - IMPORTANT: Order matters!
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/schemes', require('./routes/schemes'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/exports', require('./routes/exports'));
app.use('/api/states', require('./routes/states'));
app.use('/api/districts', require('./routes/districts'));

// 404 handler - FIXED (no wildcard parameter issue)
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server: http://localhost:${PORT}`);
  console.log(`✅ Health: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Login: POST http://localhost:${PORT}/api/auth/login`);
  console.log(`👤 Users: http://localhost:${PORT}/api/users`);
  console.log(`👥 Customers: http://localhost:${PORT}/api/customers`);
  console.log(`📋 Schemes: http://localhost:${PORT}/api/schemes`);
  console.log(`💰 Payments: http://localhost:${PORT}/api/payments`);
  console.log(`🌍 States: http://localhost:${PORT}/api/states`);
  console.log(`🏘️ Districts: http://localhost:${PORT}/api/districts`);
  console.log(`📥 Exports: http://localhost:${PORT}/api/exports`);
});
