const express = require('express');
const router = express.Router();
const { sendManualReminders } = require('../controllers/reminderController');
const auth = require('../middleware/auth');

// Allow authenticated users to trigger reminders manually
router.post('/send', auth, sendManualReminders);

module.exports = router;
