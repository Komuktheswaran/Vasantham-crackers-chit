const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:3000'
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 100 
});
app.use('/api/', limiter);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const { executeQuery } = require('./models/db');
    await executeQuery('SELECT 1');
    res.json({ status: 'OK', db: 'Connected', timestamp: new Date() });
  } catch {
    res.status(500).json({ status: 'Error', db: 'Disconnected' });
  }
});

// API Routes - IMPORTANT: Order matters!
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/schemes', require('./routes/schemes'));
app.use('/api/payments', require('./routes/payments'));
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
  console.log(`👥 Customers: http://localhost:${PORT}/api/customers`);
  console.log(`📋 Schemes: http://localhost:${PORT}/api/schemes`);
  console.log(`🌍 States: http://localhost:${PORT}/api/states`);
  console.log(`🏘️ Districts: http://localhost:${PORT}/api/districts`);
  console.log(`🔐 Login: POST http://localhost:${PORT}/api/auth/login`);
});
