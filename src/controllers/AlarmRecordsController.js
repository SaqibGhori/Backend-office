const AlarmRecord = require("../models/AlarmRecord");
const AlarmSetting  = require("../models/AlarmSetting");
const ReadingDynamic = require("../models/ReadingDynamic");
const mongoose = require("mongoose");

exports.getAlarmCountsPerGateway = async (req, res) => {
  try {
    const result = await mongoose.connection.db
      .collection("alarmrecords") 
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
    console.error("Error in getAlarmCountsPerGateway:", err.message);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};


exports.getAlarmRecords = async (req, res) => {
  try {
    const { gatewayId, page = 1, limit = 100, startDate, endDate } = req.query;
    const pg = parseInt(page);
    const lim = parseInt(limit);

    const matchStage = {};

    if (gatewayId) {
      matchStage.gatewayId = gatewayId;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      matchStage.timestamp = { $gte: start, $lte: end };
    }

    const pipeline = [
      { $match: matchStage },
      { $sort: { timestamp: -1 } },
      {
        $facet: {
          paginated: [
            { $skip: (pg - 1) * lim },
            { $limit: lim }
          ],
          totalCount: [
            { $count: "total" }
          ]
        }
      }
    ];

    const result = await AlarmRecord.aggregate(pipeline).exec();

    const data = result[0].paginated;
    const total = result[0].totalCount[0]?.total || 0;

    res.json({
      data,
      total,
      page: pg,
      totalPages: Math.ceil(total / lim)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cannot fetch filtered alarm records" });
  }
};

exports.postAlarmRecords = async (req, res) => {
  try {
    const rec = new AlarmRecord(req.body);
    await rec.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cannot save alarm record" });
  }
};

exports.alarmRecordsExport = async (req, res) => {
  try {
    const { gatewayId, startDate, endDate, interval = 0 } = req.query;
    const gap = Math.min(parseInt(interval), 59);

    if (!gatewayId) return res.status(400).json({ error: "gatewayId is required" });

    const matchStage = { gatewayId };
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchStage.timestamp = { $gte: start, $lte: end };
    }

    const pipeline = [
      { $match: matchStage },
      { $sort: { timestamp: -1 } },
      {
        $setWindowFields: {
          partitionBy: "$gatewayId",
          sortBy: { timestamp: -1 },
          output: {
            prevTimestamp: {
              $shift: {
                by: 1,
                output: "$timestamp"
              }
            }
          }
        }
      },
      {
        $addFields: {
          timeDiff: {
            $cond: [
              { $not: ["$prevTimestamp"] },
              gap + 1,
              {
                $divide: [
                  { $subtract: ["$timestamp", "$prevTimestamp"] },
                  1000
                ]
              }
            ]
          }
        }
      },
      {
        $match: {
          timeDiff: { $gte: gap }
        }
      }
    ];

    const data = await AlarmRecord.aggregate(pipeline).exec();
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cannot export alarm data" });
  }
};

exports.alarmGenerate = async (req, res) => {
  try {
    const { gatewayId, page = 1, limit = 20 } = req.query;
    const pg = parseInt(page,10), lim = parseInt(limit,10);

    const settings = await AlarmSetting.find({ gatewayId }).lean();

    const readings = await ReadingDynamic.find({ gatewayId }).lean();

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

    const total = allAlarms.length;
    const totalPages = Math.ceil(total/lim);
    const start = (pg-1)*lim;
    const pageAlarms = allAlarms.slice(start, start+lim);

    res.json({ data: pageAlarms, total, page: pg, totalPages });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error:"Failed to fetch alarms" });
  }
};