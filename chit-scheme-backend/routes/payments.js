const express = require('express');
const { getPaymentsByCustomer, recordPayment } = require('../controllers/paymentController');
const router = express.Router();

router.get('/customer/:customerId', getPaymentsByCustomer);
router.post('/', recordPayment);

module.exports = router;
