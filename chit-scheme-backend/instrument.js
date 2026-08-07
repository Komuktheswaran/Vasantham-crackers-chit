// MUST be required at the very top of server.js, before any other require.
// Sentry's v10 SDK auto-instruments express/http/mssql by patching modules at
// require-time — anything loaded before this file is invisible to Sentry.
require('dotenv').config();

if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Capture 10% of transactions in prod, 100% in dev. Tune down if quota is tight.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Send personally-identifying request headers? No — we already mask in morgan.
    sendDefaultPii: false,
  });
  console.log('🛡  Sentry initialised');
} else {
  // Intentional no-op: dev machines without a DSN should not error out.
  console.log('ℹ️  Sentry disabled (no SENTRY_DSN set)');
}
