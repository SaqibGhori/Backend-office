const express = require("express");
const AlarmRecord = require("../models/AlarmRecord");
const {getAlarmCountsPerGateway} = require("../controllers/AlarmRecordsController")
const router = express.Router();

router.get("/alarm-counts", getAlarmCountsPerGateway);

// 1) GET all records for this gateway, paginated
router.get("/alarm-records", async (req, res) => {
  try {
    const { gatewayId, page = 1, limit = 100 } = req.query;
    const pg = parseInt(page), lim = parseInt(limit);
    const skip = (pg - 1) * lim;

    const [total, records] = await Promise.all([
      AlarmRecord.countDocuments({ gatewayId }),
      AlarmRecord.find({ gatewayId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),
    ]);

    res.json({
      data: records,
      total,
      page: pg,
      totalPages: Math.ceil(total / lim),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cannot fetch alarm records" });
  }
});

// 2) POST new record
router.post("/alarm-records", async (req, res) => {
  try {
    const rec = new AlarmRecord(req.body);
    await rec.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cannot save alarm record" });
  }
});

exports.getAlarmCountsPerGateway = async (req, res) => {
  try {
    const result = await mongoose.connection.db
      .collection("alarmrecords") // ← make sure this matches actual collection name
      .aggregate([
        {
          $group: {
            _id: "$gatewayId",
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            gatewayId: "$_id",
            count: 1,
            _id: 0
          }
        }
      ])
      .toArray();

    res.status(200).json(result);
  } catch (err) {
    console.error("❌ Error in getAlarmCountsPerGateway:", err.message);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

module.exports = router;


