// src/controllers/readingController.js
const ReadingDynamic = require('../models/ReadingDynamic');
const ReadingDynamicSchema = require('../models/LatestReadings')

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

    // Build match object
    const match = { gatewayId };

    // If start/end present, use $expr + $toDate to filter timestamp strings
    if (startDate || endDate) {
      const conditions = [];
      if (startDate) conditions.push({ $gte: [ { $toDate: '$timestamp' }, new Date(startDate) ] });
      if (endDate)   conditions.push({ $lte: [ { $toDate: '$timestamp' }, new Date(endDate) ] });
      match.$expr = { $and: conditions };
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Aggregate: convert timestamp → Date, sort desc, apply skip/limit
    const data = await ReadingDynamic.aggregate([
      { $match: match },
      { $addFields: { tsDate: { $toDate: '$timestamp' } } },
      { $sort:    { tsDate: -1 } },
      { $skip:    skip },
      { $limit:   Number(limit) },
      { $project: { tsDate: 0 } },  // drop the helper field
    ]);

    const total = await ReadingDynamic.countDocuments(match);
    res.json({ data, total });
  } catch (err) {
    console.error('getReadings error', err);
    res.status(500).json({ error: 'Server error' });
  }
};
