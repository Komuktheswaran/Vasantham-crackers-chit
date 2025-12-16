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
const upload = multer({ storage: multer.memoryStorage() });

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
