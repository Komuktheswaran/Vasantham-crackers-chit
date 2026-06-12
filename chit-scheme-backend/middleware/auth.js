// Backwards-compatible re-export. Keeps `require('../middleware/auth')` working
// for existing callers (currently routes/reminders.js) while consolidating the
// actual implementation in middleware/adminAuth.js. New code should import
// { authenticateToken, requireAdmin } from './adminAuth' directly.
const { authenticateToken } = require('./adminAuth');
module.exports = authenticateToken;
