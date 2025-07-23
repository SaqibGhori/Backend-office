const express = require("express");
const { getAlarmCountsPerGateway , getAlarmRecords , postAlarmRecords , alarmRecordsExport , alarmGenerate } = require("../controllers/AlarmRecordsController")
const router = express.Router();

router.get("/alarm-counts", getAlarmCountsPerGateway);
router.get("/alarm-records", getAlarmRecords);
router.post("/alarm-records", postAlarmRecords);
router.get("/alarm-records/export", alarmRecordsExport);
router.get("/alarms", alarmGenerate);

module.exports = router;