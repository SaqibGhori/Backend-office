// src/routes/alarmSettingsRoutes.js
const express = require("express");
const AlarmSetting = require("../models/AlarmSetting");
const router = express.Router();

router
  .route("/alarm-settings")
  .get(async (req, res) => {
    const { gatewayId } = req.query;
    let settings = await AlarmSetting.find({ gatewayId }).lean();
    // initialization logic agar chahiye
    res.json(settings);
  })
  .post(async (req, res) => {
    try {
      const { gatewayId, settings } = req.body;  
      // delete old
      await AlarmSetting.deleteMany({ gatewayId });
      // insert new—each s has high, low, priority, message
      await AlarmSetting.insertMany(
        settings.map(s => ({
          gatewayId,
          category:    s.category,
          subcategory: s.subcategory,
          high:        s.high,
          low:         s.low,
          priority:    s.priority,
          message:     s.message,    // yahan message bhi save hoga
        }))
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

module.exports = router;
