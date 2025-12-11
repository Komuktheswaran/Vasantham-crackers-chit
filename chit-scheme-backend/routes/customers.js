const express = require('express');
const multer = require('multer');
const {
  getAllCustomers, getCustomerById, createCustomer,
  updateCustomer, deleteCustomer, checkCustomerId, downloadCustomers, uploadCustomers,
  getCustomerSchemes, assignSchemes
} = require('../controllers/customerController_v2');
const { customerValidation } = require('../middleware/validators');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), uploadCustomers);
router.get('/download', downloadCustomers);
router.get('/', getAllCustomers);
router.get('/check/:id', checkCustomerId); // New route for checking ID
router.get('/:id', getCustomerById);
router.post('/', customerValidation, createCustomer);
router.put('/:id', customerValidation, updateCustomer);
router.delete('/:id', deleteCustomer);
router.get('/:id/schemes', getCustomerSchemes);
router.post('/:id/schemes', assignSchemes);

module.exports = router;
