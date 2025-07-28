const router = require('express').Router();
const { createReading } = require('../controllers/ingestController');

// devices will POST here without any token
router.post('/reading', createReading);

module.exports = router;
