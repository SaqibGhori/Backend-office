const express = require("express");
const {getAlarmSettings , saveAlarmSettings } = require("../controllers/AlarmSettingsController");
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
router.use(authMiddleware);
router.get("/", getAlarmSettings);
router.post("/", saveAlarmSettings);

module.exports = router;
