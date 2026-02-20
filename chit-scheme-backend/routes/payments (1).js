const { getPaymentsByCustomer, recordPayment, getDuesByScheme, getDuesByFundNumber, getAllPayments, payAllDues } = require('../controllers/paymentController');
const express = require('express');
const { paymentValidation } = require('../middleware/validators');
const router = express.Router();

router.get('/', getAllPayments);
router.get('/customer/:customerId', getPaymentsByCustomer);
// Kept legacy route for safety if needed, or we can replace it. 
// Given instructions "use fund number... for all operation", I will replace the main usage route.
// But to avoid breaking if frontend still calls old one, I'll add the new one and mapped the old one? 
// Actually, I renamed the controller function. So I must update the import and usage.
router.get('/dues/:fundNumber', getDuesByFundNumber);
router.post('/pay-all', payAllDues);
router.post('/', paymentValidation, recordPayment);

module.exports = router;
