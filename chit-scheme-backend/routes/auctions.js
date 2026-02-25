const express = require('express');
const router = express.Router();

const {
  createAuction,
  getAuctions,
  getAuctionsByMembership,
  updateAuction,
  deleteAuction
} = require('../controllers/auctionController');

// GET  /api/auctions?membership_id=&customer_id=&page=&limit=
router.get('/', getAuctions);

// GET  /api/auctions/by-membership/:membershipId
router.get('/by-membership/:membershipId', getAuctionsByMembership);

// POST /api/auctions   body: { Membership_ID, Discount_amount, Auction_date }
router.post('/', createAuction);

// PUT  /api/auctions/:id
router.put('/:id', updateAuction);

// DELETE /api/auctions/:id
router.delete('/:id', deleteAuction);

module.exports = router;
