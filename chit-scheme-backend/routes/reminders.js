const express = require('express');
const router = express.Router();
const { sendManualReminders } = require('../controllers/reminderController');
const { isAdmin } = require('../middleware/auth');

// Allow admin to trigger reminders manually
router.post('/send', isAdmin, sendManualReminders);

module.exports = router;
