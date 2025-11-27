const express = require('express');
const multer = require('multer');
const { 
    getAllSchemes, 
    createScheme, 
    getSchemeById, 
    updateScheme, 
    deleteScheme,
    downloadSchemes,
    uploadSchemes
} = require('../controllers/schemeController');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), uploadSchemes);
router.get('/download', downloadSchemes);
router.get('/', getAllSchemes);
router.get('/:id', getSchemeById);
router.post('/', createScheme);
router.put('/:id', updateScheme);
router.delete('/:id', deleteScheme);

module.exports = router;
