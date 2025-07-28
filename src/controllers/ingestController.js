const ReadingDynamic = require('../models/ReadingDynamic');

exports.createReading = async (req, res, next) => {
  try {
    const reading = await ReadingDynamic.create(req.body);
    res.status(201).json(reading);
  } catch (err) {
    next(err);
  }
};
