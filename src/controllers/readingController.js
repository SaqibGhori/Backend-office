const mongoose = require("mongoose");
const ReadingDynamic = require('../models/ReadingDynamic');
const ReadingDynamicSchema = require('../models/LatestReadings')

exports.listGateways = async (req, res) => {
  const list = await ReadingDynamic.distinct('gatewayId');
  res.json(list);
};

exports.getReadings = async (req, res) => {
  const { gatewayId, startDate, endDate, page=1, limit=50 } = req.query;
  const filter = {};
  if (gatewayId) filter.gatewayId = gatewayId;
  if (startDate||endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = startDate;
    if (endDate)   filter.timestamp.$lte = endDate;
  }
  const skip = (page-1)*limit;
  const data = await ReadingDynamic.find(filter).sort({timestamp:-1}).skip(skip).limit(Number(limit)).lean();
  const total = await ReadingDynamic.countDocuments(filter);
  res.json({ data, total });
};


exports.getLatestReadings = async (req, res) => {
  try {
    const db = mongoose.connection.db;

    const pipeline = [
      // Step 1: get latest timestamp per gateway
      {
        $group: {
          _id: "$gatewayId",
          latestTimestamp: { $max: "$timestamp" }
        }
      },

      // Step 2: Join back to get full document
      {
        $lookup: {
          from: "readingdynamics", // 👈 actual collection name
          let: { gateway: "$_id", ts: "$latestTimestamp" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$gatewayId", "$$gateway"] },
                    { $eq: ["$timestamp", "$$ts"] }
                  ]
                }
              }
            }
          ],
          as: "latestDoc"
        }
      },

      // Step 3: Flatten
      { $unwind: "$latestDoc" },
      { $replaceRoot: { newRoot: "$latestDoc" } }
    ];

    const result = await db
      .collection("readingdynamics") // ✅ double-check this name
      .aggregate(pipeline, { allowDiskUse: true })
      .toArray();

    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Final Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
