const express = require('express');
const { schemeValidation } = require('../middleware/validators');
const router = express.Router();

// ✅ Import ONLY functions that exist in controller
const {
  getAllSchemes,
  getSchemeById,
  createScheme,
  updateScheme,
  deleteScheme,
  downloadSchemes,
  getSchemeMembers,
  uploadSchemes
} = require('../controllers/schemeController');

const multer = require('multer');
const path = require('path');

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

// ✅ Route definitions - ALL functions exist
router.get('/members', getSchemeMembers);
router.get('/', getAllSchemes);
router.post('/upload', upload.single('file'), uploadSchemes);
router.get('/:id', getSchemeById);
router.post('/', schemeValidation, createScheme);
router.put('/:id', schemeValidation, updateScheme);
router.delete('/:id', deleteScheme);
router.get('/download', downloadSchemes);

module.exports = router;
