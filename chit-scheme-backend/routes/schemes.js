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
  downloadSchemes
} = require('../controllers/schemeController');

// ✅ Route definitions - ALL functions exist
router.get('/', getAllSchemes);
router.get('/:id', getSchemeById);
router.post('/', schemeValidation, createScheme);
router.put('/:id', schemeValidation, updateScheme);
router.delete('/:id', deleteScheme);
router.get('/download', downloadSchemes);

module.exports = router;
