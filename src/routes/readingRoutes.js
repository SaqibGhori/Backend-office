// src/routes/readingRoutes.js
const express = require('express');
const { listGateways, getReadings, getLatestReadings  } = require('../controllers/readingController');
const router = express.Router();

router.get('/gateways', listGateways);
router.get('/readingsdynamic', getReadings);
router.get("/latest-readings", getLatestReadings);


module.exports = router;