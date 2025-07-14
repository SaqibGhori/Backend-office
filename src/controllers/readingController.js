// src/controllers/readingController.js
const mongoose = require("mongoose");
const ReadingDynamic = require('../models/ReadingDynamic');

exports.listGateways = async (req, res) => {
  try {
    const list = await ReadingDynamic.distinct('gatewayId');
    res.json(list);
  } catch (err) {
    console.error('listGateways error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getReadings = async (req, res) => {
  try {
    const { gatewayId, startDate, endDate, page = 1, limit = 50 } = req.query;

    if (!gatewayId) {
      return res.status(400).json({ error: 'gatewayId is required' });
    }

    const match = { gatewayId };
    if (startDate || endDate) {
      const conds = [];
      if (startDate) conds.push({ $gte: [ { $toDate: '$timestamp' }, new Date(startDate) ] });
      if (endDate)   conds.push({ $lte: [ { $toDate: '$timestamp' }, new Date(endDate)   ] });
      match.$expr = { $and: conds };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const data = await ReadingDynamic.aggregate([
      { $match: match },
      { $addFields: { tsDate: { $toDate: '$timestamp' } } },
      { $sort:    { tsDate: -1 } },
      { $skip:    skip },
      { $limit:   Number(limit) },
      { $project: { tsDate: 0 } }
    ]);

    const total = await ReadingDynamic.countDocuments(match);
    res.json({ data, total });
  } catch (err) {
    console.error('getReadings error', err);
    res.status(500).json({ error: 'Server error' });
  }
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