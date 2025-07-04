const express = require('express');
const { listGateways, getReadings } = require('../controllers/readingController');
const router = express.Router();

router.get('/gateways', listGateways);
router.get('/readingsdynamic', getReadings);

module.exports = router;
