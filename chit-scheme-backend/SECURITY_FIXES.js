// ====================================================================
// SECURITY FIXES - Apply These Changes
// ====================================================================
// This file contains the critical security fixes identified in the audit
// Apply these changes to secure your application
// ====================================================================

// ====================================================================
// FIX 1: Secure CORS Configuration
// File: server.js (Replace line 15)
// ====================================================================

// ❌ REMOVE THIS (Line 15):
// app.use(cors());

// ✅ ADD THIS INSTEAD:
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'https://103.38.50.149:3000',  // Your production frontend
      'http://localhost:3000',        // Development frontend
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

// Add to .env file:
// ALLOWED_ORIGINS=https://103.38.50.149:3000,http://localhost:3000


// ====================================================================
// FIX 2: Secure File Upload Configuration
// Files: routes/schemes.js and routes/customers.js
// ====================================================================

// ❌ REMOVE THIS from both files:
// const upload = multer({ storage: multer.memoryStorage() });

// ✅ ADD THIS INSTEAD:
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB maximum file size
  },
  fileFilter: (req, file, cb) => {
    // Only allow CSV and Excel files
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroEnabled.12'
    ];
    
    const allowedExtensions = ['.csv', '.xls', '.xlsx'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files (.csv, .xls, .xlsx) are allowed.'));
    }
  }
});

// Add path module import at top of file:
// const path = require('path');


// ====================================================================
// FIX 3: Fixed Rate Limiting Configuration
// File: server.js (Replace lines 26-55)
// ====================================================================

// ❌ REMOVE THESE (Lines 26-55 in server.js):
/*
const limiter = rateLimit({
  windowMs: 15 * 60 * 10000,  // TYPO: Should be 1000
  max: 1000,                   // TOO HIGH
  // ...
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,                  // WAY TOO HIGH!
  // ...
});
*/

// ✅ ADD THIS INSTEAD:
const rateLimit = require('express-rate-limit');

// General API rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes (FIXED TYPO)
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  // IP extraction for proxies
  keyGenerator: (req) => {
    return req.ip || 
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.socket?.remoteAddress || 
           'unknown';
  },
});

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes.',
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

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);


// ====================================================================
// FIX 4: Production Error Handling
// Apply to ALL controller files (*.js in controllers/)
// ====================================================================

// ❌ CURRENT (exposes details):
// res.status(500).json({ error: error.message });

// ✅ REPLACE WITH:
res.status(500).json({ 
  error: process.env.NODE_ENV === 'production' 
    ? 'An error occurred processing your request' 
    : error.message,
  ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
});


// ====================================================================
// FIX 5: HTTPS Enforcement in Production
// File: server.js (Add after app initialization, before routes)
// ====================================================================

// Add this middleware (after line 23 in server.js):
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Check if request is secure
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      next();
    } else {
      // Redirect to HTTPS
      res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
  });
}


// ====================================================================
// FIX 6: Enhanced Helmet.js Configuration
// File: server.js (Replace line 21)
// ====================================================================

// ❌ REMOVE THIS (Line 21):
// app.use(helmet());

// ✅ ADD THIS INSTEAD:
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
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
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true
}));


// ====================================================================
// FIX 7: Authorization Middleware for IDOR Protection
// Create new file: middleware/authorize.js
// ====================================================================

const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

const authorizeOwnerOrAdmin = (paramName = 'id') => {
  return (req, res, next) => {
    const requestedId = req.params[paramName];
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    // Allow if admin or if user owns the resource
    if (userRole === 'admin' || String(userId) === String(requestedId)) {
      next();
    } else {
      res.status(403).json({ error: 'Access denied. You can only access your own resources.' });
    }
  };
};

module.exports = { authorizeAdmin, authorizeOwnerOrAdmin };

// Then apply in routes:
// const { authorizeAdmin } = require('../middleware/authorize');
// router.delete('/:id', auth, authorizeAdmin, deleteScheme);


// ====================================================================
// FIX 8: Generate Strong JWT Secret
// ====================================================================
// Run this command in terminal to generate a secure secret:
// node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
// 
// Then update .env file:
// JWT_SECRET=<paste-the-generated-value-here>


// ====================================================================
// VERIFICATION STEPS
// ====================================================================
/*
1. Apply all fixes above
2. Update .env file with:
   - Strong JWT_SECRET (128 characters minimum)
   - ALLOWED_ORIGINS=https://your-frontend.com,http://localhost:3000
3. Restart the server
4. Test CORS:
   curl -H "Origin: http://unauthorized.com" -I http://localhost:5000/api/health
   (Should be blocked)
5. Test file upload with non-CSV file (should be rejected)
6. Test rate limiting (make 6 rapid requests to /api/auth/login)
7. Run: npm audit
8. Check audit logs are working

IMPORTANT: Test thoroughly in development before deploying to production!
*/
