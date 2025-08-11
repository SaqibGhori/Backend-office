// src/routes/gatewayRoutes.js
const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const {
  createGateway,
  getUserGateways
} = require('../controllers/gatewayController');

// all /api/gateways/* routes require a valid JWT
router.use(authMiddleware);

// POST /api/gateways
router.post('/', createGateway);

// GET  /api/gateways
router.get('/', getUserGateways);

module.exports = router;
