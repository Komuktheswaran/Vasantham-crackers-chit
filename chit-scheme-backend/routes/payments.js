const { getPaymentsByCustomer, recordPayment, getDuesByScheme, getAllPayments } = require('../controllers/paymentController');
const express = require('express');
const { paymentValidation } = require('../middleware/validators');
const router = express.Router();

router.get('/', getAllPayments);
router.get('/customer/:customerId', getPaymentsByCustomer);
router.get('/dues/:customerId/:schemeId', getDuesByScheme);
router.post('/', paymentValidation, recordPayment);

module.exports = router;
