const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  checkCustomerId,
  assignSchemes,
  getCustomerSchemes,
  exportCustomers,
  bulkCreateCustomers,
  getNextFundNumber,
  getNextCustomerId,
  getCustomerByFundNumber,
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

// Utility endpoints (put before /:id routes to avoid conflicts)
router.get('/next-fund-number', getNextFundNumber);
router.get('/next-customer-id', getNextCustomerId);
router.get('/check-id', checkCustomerId);
router.get('/export', exportCustomers);
router.get('/fund/:fundNumber', getCustomerByFundNumber);
router.post('/bulk-upload', upload.single('file'), bulkCreateCustomers);

// Customer CRUD
router.get('/', getAllCustomers);
router.post('/', customerValidation, createCustomer);

// Scheme assignment - MUST be BEFORE /:id(*) routes to match first
router.post('/:id(*)/schemes', assignSchemes);
router.get('/:id(*)/schemes', getCustomerSchemes);

// Generic customer routes with wildcard (AFTER more specific routes)
router.get('/:id(*)', getCustomerById);
router.put('/:id(*)', customerValidation, updateCustomer);
router.delete('/:id(*)', deleteCustomer);

module.exports = router;
