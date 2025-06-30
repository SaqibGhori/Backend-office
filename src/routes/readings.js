const router     = require('express').Router();
const controller = require('../controllers/readingController');

router.get('/gateways',        controller.listGateways);
router.get('/readingsdynamic', controller.getReadings);

module.exports = router;
