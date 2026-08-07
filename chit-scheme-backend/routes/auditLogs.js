const express = require('express');
const { getAuditLogs } = require('../controllers/auditLogController');
const { authenticateToken, requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();
router.use(authenticateToken, requireAdmin);
router.get('/', getAuditLogs);

module.exports = router;
