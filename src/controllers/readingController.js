const mongoose = require("mongoose");
const ReadingDynamic = require('../models/ReadingDynamic');
const Gateway = require("../models/Gateway");

exports.listGateways = async (req, res) => {
  try {
    const gateways = await Gateway.find({ user: req.user.userId }).select("gatewayId name location");
    res.json(gateways); // returns array of gateway objects
  } catch (err) {
    console.error("listGateways error", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getReadings = async (req, res) => {
  try {
    const { gatewayId, startDate, endDate, page = 1, limit = 50, interval } = req.query;

    if (!gatewayId) {
      return res.status(400).json({ error: "gatewayId is required" });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const parsedInterval = parseInt(interval);
    const useInterval = !isNaN(parsedInterval) && parsedInterval > 0;

    // 👇 Add userId to filter

    const match = {
      gatewayId,
      userId: new mongoose.Types.ObjectId(req.user.userId),
    };

    console.log("MATCH FILTER:", match);
    if (startDate || endDate) {
      const conds = [];
      if (startDate) conds.push({ $gte: [{ $toDate: "$timestamp" }, new Date(startDate)] });
      if (endDate) conds.push({ $lte: [{ $toDate: "$timestamp" }, new Date(endDate)] });
      match.$expr = { $and: conds };
    }

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

    if (useInterval) {
      basePipeline.push({ $sort: { tsDate: 1 } });

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

      basePipeline.push({ $project: { reading: "$result.result" } });
      basePipeline.push({ $unwind: "$reading" });
      basePipeline.push({ $replaceRoot: { newRoot: "$reading" } });
    }

    const countPipeline = [...basePipeline, { $count: "total" }];
    const countResult = await ReadingDynamic.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    const dataPipeline = [
      ...basePipeline,
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
    const userId = req.user.userId; // 👈 from middleware
    const db = mongoose.connection.db;

    const pipeline = [
      {
        // 🔍 Only include readings for this user
        $match: { userId: new mongoose.Types.ObjectId(userId) }
      },
      {
        $group: {
          _id: "$gatewayId",
          latestTimestamp: { $max: "$timestamp" }
        }
      },
      {
        $lookup: {
          from: "readingdynamics",
          let: { gateway: "$_id", ts: "$latestTimestamp" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$gatewayId", "$$gateway"] },
                    { $eq: ["$timestamp", "$$ts"] },
                    { $eq: ["$userId", new mongoose.Types.ObjectId(userId)] } // 🔁 double-check inside lookup too
                  ]
                }
              }
            }
          ],
          as: "latestDoc"
        }
      },
      { $unwind: "$latestDoc" },
      { $replaceRoot: { newRoot: "$latestDoc" } }
    ];

    const result = await db
      .collection("readingdynamics")
      .aggregate(pipeline, { allowDiskUse: true })
      .toArray();

    res.status(200).json(result);
  } catch (error) {
    console.error("Final Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
