const express = require('express');
const {
  getAllTransporters,
  getTransporterById,
  createTransporter,
  updateTransporter,
  deleteTransporter,
  getDeliveryPoints,
  addDeliveryPoint,
  deleteDeliveryPoint,
  getAllDeliveryPoints
} = require('../controllers/transporterController');

const router = express.Router();

// Delivery Points routes (must come before /:id routes to avoid conflicts)
router.get('/delivery-points/all', getAllDeliveryPoints);
router.delete('/delivery-points/:pointId', deleteDeliveryPoint);

// Transporter routes
router.get('/', getAllTransporters);
router.get('/:id', getTransporterById);
router.post('/', createTransporter);
router.put('/:id', updateTransporter);
router.delete('/:id', deleteTransporter);

// Delivery Point routes for specific transporter
router.get('/:id/delivery-points', getDeliveryPoints);
router.post('/:id/delivery-points', addDeliveryPoint);

module.exports = router;
