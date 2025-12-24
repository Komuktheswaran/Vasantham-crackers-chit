const express = require('express');
const router = express.Router();
const orderTrackingController = require('../controllers/orderTrackingController');

router.get('/', orderTrackingController.getAllOrders);
router.post('/', orderTrackingController.createOrder);
router.put('/:id', orderTrackingController.updateOrder);
router.delete('/:id', orderTrackingController.deleteOrder);

module.exports = router;
