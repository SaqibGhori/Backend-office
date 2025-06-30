const Reading = require('../models/Reading');

exports.listGateways = () =>
  Reading.distinct('gatewayId');

exports.getReadings = ({ gatewayId, startDate, endDate, page, limit }) => {
  const filter = {};
  if (gatewayId) filter.gatewayId = gatewayId;
  if (startDate || endDate) filter.timestamp = {};
  if (startDate) filter.timestamp.$gte = new Date(startDate);
  if (endDate)   filter.timestamp.$lte = new Date(endDate);

  const skip = (page - 1) * limit;
  return Promise.all([
    Reading.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Reading.countDocuments(filter)
  ]);
};
