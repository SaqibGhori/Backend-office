const express = require('express');
const router = express.Router();
const {
  listGateways,
  getReadings,
  getLatestReadings,
} = require('../controllers/readingController');

const { authMiddleware } = require('../middleware/auth');

// 🔐 Secure all routes below with JWT auth
router.use(authMiddleware);

// ✅ GET /api/gateways — now user-specific
router.get('/gateways', listGateways);

// ✅ GET /api/readingsdynamic?gatewayId=xxx
router.get('/readingsdynamic', getReadings);

// ✅ GET /api/latest-readings
router.get('/latest-readings', getLatestReadings);

module.exports = router;
