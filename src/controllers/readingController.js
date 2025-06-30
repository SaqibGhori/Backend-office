const service = require('../services/readingService');

exports.listGateways = async (req, res, next) => {
  try {
    const data = await service.listGateways();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getReadings = async (req, res, next) => {
  try {
    const { data, total } = await service.getReadings({
      gatewayId: req.query.gatewayId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page:  Number(req.query.page)  || 1,
      limit: Number(req.query.limit) || 50,
    });
    res.json({ data, total });
  } catch (err) {
    next(err);
  }
};
