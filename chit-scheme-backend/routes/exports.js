const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');

// Export routes
router.get('/customers', exportController.exportCustomers);
router.get('/payments', exportController.exportPayments);
router.get('/schemes', exportController.exportSchemes);

module.exports = router;
