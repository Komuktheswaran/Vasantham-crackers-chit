const express = require('express');
const multer = require('multer');
const {
  getAllCustomers, getCustomerById, createCustomer,
  updateCustomer, deleteCustomer, checkCustomerId, downloadCustomers, uploadCustomers
} = require('../controllers/customerController');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), uploadCustomers);
router.get('/download', downloadCustomers);
router.get('/', getAllCustomers);
router.get('/check/:id', checkCustomerId); // New route for checking ID
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

module.exports = router;
