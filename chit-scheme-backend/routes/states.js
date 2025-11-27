const express = require('express');
const { getAllStates } = require('../controllers/stateController');
const router = express.Router();

router.get('/', getAllStates);

module.exports = router;
