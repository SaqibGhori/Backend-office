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

// exports.getReadings = async (req, res) => {
//   try {
//     const { gatewayId, startDate, endDate, page = 1, limit = 50 } = req.query;

//     if (!gatewayId) {
//       return res.status(400).json({ error: 'gatewayId is required' });
//     }

//     const match = { gatewayId };
//     if (startDate || endDate) {
//       const conds = [];
//       if (startDate) conds.push({ $gte: [ { $toDate: '$timestamp' }, new Date(startDate) ] });
//       if (endDate)   conds.push({ $lte: [ { $toDate: '$timestamp' }, new Date(endDate)   ] });
//       match.$expr = { $and: conds };
//     }

//     const skip = (Number(page) - 1) * Number(limit);

//     const data = await ReadingDynamic.aggregate([
//       { $match: match },
//       { $addFields: { tsDate: { $toDate: '$timestamp' } } },
//       { $sort:    { tsDate: -1 } },
//       { $skip:    skip },
//       { $limit:   Number(limit) },
//       { $project: { tsDate: 0 } }
//     ]);

//     const total = await ReadingDynamic.countDocuments(match);
//     res.json({ data, total });
//   } catch (err) {
//     console.error('getReadings error', err);
//     res.status(500).json({ error: 'Server error' });
//   }
// };

exports.getReadings = async (req, res) => {
  try {
    const { gatewayId, startDate, endDate, page = 1, limit = 50, interval } = req.query;

    if (!gatewayId) {
      return res.status(400).json({ error: "gatewayId is required" });
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    const parsedInterval = parseInt(interval);
    const useInterval = !isNaN(parsedInterval) && parsedInterval > 0;

    // Step 1: Match filter
    const match = { gatewayId };

    if (startDate || endDate) {
      const conds = [];
      if (startDate) conds.push({ $gte: [{ $toDate: "$timestamp" }, new Date(startDate)] });
      if (endDate) conds.push({ $lte: [{ $toDate: "$timestamp" }, new Date(endDate)] });
      match.$expr = { $and: conds };
    }

    // Step 2: Convert timestamp field safely
    const basePipeline = [
      { $match: match },
      {
        $addFields: {
          tsDate: {
            $cond: {
              if: { $eq: [{ $type: "$timestamp" }, "date"] },
              then: "$timestamp",
              else: { $toDate: "$timestamp" }
            }
          }
        }
      }
    ];

    // Step 3: Interval logic using $reduce (if needed)
    if (useInterval) {
      basePipeline.push({ $sort: { tsDate: 1 } }); // oldest first

      basePipeline.push({
        $group: {
          _id: null,
          data: {
            $push: {
              gatewayId: "$gatewayId",
              timestamp: "$timestamp",
              data: "$data",
              tsDate: "$tsDate"
            }
          }
        }
      });

      basePipeline.push({
        $project: {
          result: {
            $reduce: {
              input: "$data",
              initialValue: {
                result: [],
                lastTime: null
              },
              in: {
                $let: {
                  vars: {
                    current: "$$this.tsDate",
                    currentTs: { $toLong: "$$this.tsDate" }
                  },
                  in: {
                    $cond: [
                      {
                        $or: [
                          { $eq: ["$$value.lastTime", null] },
                          {
                            $gte: [
                              { $subtract: ["$$currentTs", "$$value.lastTime"] },
                              parsedInterval * 1000
                            ]
                          }
                        ]
                      },
                      {
                        result: { $concatArrays: ["$$value.result", ["$$this"]] },
                        lastTime: "$$currentTs"
                      },
                      "$$value"
                    ]
                  }
                }
              }
            }
          }
        }
      });

      // Flatten the result.result array
      basePipeline.push({ $project: { reading: "$result.result" } });
      basePipeline.push({ $unwind: "$reading" });
      basePipeline.push({ $replaceRoot: { newRoot: "$reading" } });
    }

    // Step 4: Count pipeline
    const countPipeline = [...basePipeline, { $count: "total" }];
    const countResult = await ReadingDynamic.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Step 5: Data pipeline with pagination
    const dataPipeline = [...basePipeline,
      { $sort: { tsDate: -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
      { $project: { tsDate: 0 } }
    ];

    const data = await ReadingDynamic.aggregate(dataPipeline);

    res.json({ data, total });

  } catch (err) {
    console.error("getReadings error:", err);
    res.status(500).json({ error: "Server error", message: err.message });
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