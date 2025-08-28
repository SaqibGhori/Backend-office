// src/routes/gatewayRoutes.js
const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const {
  createGateway,
  getUserGateways,
  updateGateway,
  deleteGateway,
} = require('../controllers/gatewayController');

// Protect all routes
router.use(authMiddleware);

// List
router.get('/', getUserGateways);

// Create
router.post('/', createGateway);
router.patch('/:id', updateGateway);
router.put('/:id', updateGateway);

// ✅ delete
router.delete('/:id', deleteGateway);
// ✅ Update
router.patch('/:id', updateGateway);

// ✅ Delete
router.delete('/:id', deleteGateway);

module.exports = router;
