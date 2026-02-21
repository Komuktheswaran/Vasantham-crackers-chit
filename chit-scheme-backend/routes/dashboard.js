const express = require('express');
const { getMonthlyStats, getCustomerStats, getCustomerDetails, getSchemeDetails, getMonthDetails, getSchemeDistributionDetails } = require('../controllers/dashboardController');
const router = express.Router();

router.get('/monthly-stats', getMonthlyStats);
router.get('/customer-stats', getCustomerStats);
router.get('/customer/:customerId(*)', getCustomerDetails);
router.get('/scheme/:schemeId', getSchemeDetails);
router.get('/month/:year/:month', getMonthDetails);
router.get('/scheme-distribution', getSchemeDistributionDetails);

module.exports = router;
