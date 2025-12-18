const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  getAllCustomers, getCustomerById, createCustomer,
  updateCustomer, deleteCustomer, checkCustomerId, downloadCustomers, uploadCustomers,
  getCustomerSchemes, assignSchemes, getCustomerByFundNumber
} = require('../controllers/customerController_v2');
const { customerValidation } = require('../middleware/validators');
const router = express.Router();

// ====================================================================
// SECURITY FIX: Secure File Upload Configuration
// ====================================================================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB maximum file size
  },
  fileFilter: (req, file, cb) => {
    // Only allow CSV and Excel files
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroEnabled.12'
    ];
    
    const allowedExtensions = ['.csv', '.xls', '.xlsx'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files (.csv, .xls, .xlsx) are allowed.'));
    }
  }
});

router.post('/upload', upload.single('file'), uploadCustomers);
router.get('/download', downloadCustomers);
router.get('/', getAllCustomers);
router.get('/fund/:fundNumber', getCustomerByFundNumber); // Specific route before generic :id
router.get('/check/:id', checkCustomerId); // New route for checking ID
router.get('/:id', getCustomerById);
router.post('/', customerValidation, createCustomer);
router.put('/:id', customerValidation, updateCustomer);
router.delete('/:id', deleteCustomer);
router.get('/:id/schemes', getCustomerSchemes);
router.post('/:id/schemes', assignSchemes);

module.exports = router;
