const { getPaymentsByCustomer, recordPayment, getDuesByScheme, getDuesByFundNumber, getAllPayments, payAllDues, updatePayment, getNextReferenceId, notifyPayment, getNextFund, getPrevFund } = require('../controllers/paymentController');
const express = require('express');
const { paymentValidation } = require('../middleware/validators');
const router = express.Router();

router.get('/', getAllPayments);
router.get('/next-reference-id', getNextReferenceId);
// O(1) prev/next fund lookups for the Payments page navigator.
// Use ?current= query param because fund numbers contain slashes
// (e.g. "fund/2026/001") and IIS Request Filtering rejects them in the path.
router.get('/fund-next', getNextFund);
router.get('/fund-prev', getPrevFund);
router.get('/customer/:customerId', getPaymentsByCustomer);
// Kept legacy route for safety if needed, or we can replace it. 
// Given instructions "use fund number... for all operation", I will replace the main usage route.
// But to avoid breaking if frontend still calls old one, I'll add the new one and mapped the old one? 
// Actually, I renamed the controller function. So I must update the import and usage.
router.get('/dues/:fundNumber(*)', getDuesByFundNumber);
router.post('/pay-all', payAllDues);
router.post('/', paymentValidation, recordPayment);
router.put('/:payId', updatePayment);
router.post('/:payId/notify', notifyPayment);

module.exports = router;
