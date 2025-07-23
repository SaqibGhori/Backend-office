const express = require("express");
const {getAlarmSettings , saveAlarmSettings } = require("../controllers/AlarmSettingsController");
const router = express.Router();

router.get("/alarm-settings", getAlarmSettings);
router.post("/alarm-settings", saveAlarmSettings);

module.exports = router;
