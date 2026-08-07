const express = require('express');
const router = express.Router();

const {
  getWinners,
  saveWinners,
  deleteWinners,
} = require('../controllers/winnersController');

// GET    /api/winners?month=YYYY-MM
router.get('/', getWinners);

// POST   /api/winners   body: { Win_Month, winners: [{ Place, Fund_Number }] }
router.post('/', saveWinners);

// DELETE /api/winners/:month   (YYYY-MM)
router.delete('/:month', deleteWinners);

module.exports = router;
