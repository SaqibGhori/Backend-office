const express = require("express");
const {getAlarmSettings , saveAlarmSettings } = require("../controllers/AlarmSettingsController");
const router = express.Router();

router.get("/", getAlarmSettings);
router.post("/", saveAlarmSettings);

module.exports = router;
