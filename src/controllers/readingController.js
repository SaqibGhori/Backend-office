const ReadingDynamic = require('../models/ReadingDynamic');

exports.listGateways = async (req, res) => {
  const list = await ReadingDynamic.distinct('gatewayId');
  res.json(list);
};

// exports.getReadings = async (req, res) => {
//   const { gatewayId, startDate, endDate, page=1, limit=50 } = req.query;
//   const filter = {};
//   if (gatewayId) filter.gatewayId = gatewayId;
//   if (startDate||endDate) {
//     filter.timestamp = {};
//     if (startDate) filter.timestamp.$gte = startDate;
//     if (endDate)   filter.timestamp.$lte = endDate;
//   }
//   const skip = (page-1)*limit;
//   const data = await ReadingDynamic.find(filter).sort({timestamp:-1}).skip(skip).limit(Number(limit)).lean();
//   const total = await ReadingDynamic.countDocuments(filter);
//   res.json({ data, total });
// };

// controllers/readingController.js
exports.getReadings = async (req, res) => {
  const { gatewayId, startDate, endDate, page = 1, limit = 50 } = req.query;
  const base = { gatewayId };

  // build expr array
  const expr = [];
  if (startDate) expr.push({
    $gte: [ { $toDate: "$timestamp" }, new Date(startDate) ]
  });
  if (endDate)   expr.push({
    $lte: [ { $toDate: "$timestamp" }, new Date(endDate) ]
  });

  const filter= { gatewayId };
  if (expr.length) filter.$expr = { $and: expr };

  const data = await ReadingDynamic.find(filter)
                    .sort({ timestamp: -1 })
                    .skip((page-1)*limit)
                    .limit(limit)
                    .lean();
  const total = await ReadingDynamic.countDocuments(filter);
  res.json({ data, total });
};
