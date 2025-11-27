const express = require('express');
const { getAllDistricts } = require('../controllers/districtController');
const router = express.Router();

router.get('/', getAllDistricts);

module.exports = router;
