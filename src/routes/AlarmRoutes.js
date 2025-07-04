const express = require("express");
const AlarmSetting  = require("../models/AlarmSetting");
const ReadingDynamic = require("../models/ReadingDynamic");
const router = express.Router();

router.get("/alarms", async (req, res) => {
  try {
    const { gatewayId, page = 1, limit = 20 } = req.query;
    const pg = parseInt(page,10), lim = parseInt(limit,10);

    // 1) thresholds
    const settings = await AlarmSetting.find({ gatewayId }).lean();

    // 2) readings
    const readings = await ReadingDynamic.find({ gatewayId }).lean();

    // 3) filter alarms
    const allAlarms = [];
    readings.forEach(r => {
      Object.entries(r.data||{}).forEach(([cat, subObj]) => {
        Object.entries(subObj).forEach(([sub, val]) => {
          const cfg = settings.find(s=>s.category===cat && s.subcategory===sub);
          if (!cfg) return;
          if (val > cfg.high || val < cfg.low) {
            allAlarms.push({
              timestamp: r.timestamp,
              category: cat,
              subcategory: sub,
              value: val,
              priority: cfg.priority
            });
          }
        });
      });
    });

    // 4) pagination
    const total = allAlarms.length;
    const totalPages = Math.ceil(total/lim);
    const start = (pg-1)*lim;
    const pageAlarms = allAlarms.slice(start, start+lim);

    res.json({ data: pageAlarms, total, page: pg, totalPages });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error:"Failed to fetch alarms" });
  }
});

module.exports = router;