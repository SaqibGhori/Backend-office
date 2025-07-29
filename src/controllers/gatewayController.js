const Gateway = require('../models/Gateway');
const { nanoid } = require('nanoid');

/**
 * Create a new Gateway (device) for the logged-in user.
 * Expects { name, location } in req.body.
 */
exports.createGateway = async (req, res, next) => {
  try {
    const { name, location } = req.body;
    if (!name || !location) {
      return res.status(400).json({ msg: 'Name and location are required' });
    }

    const gateway = await Gateway.create({
      user: req.user.userId,
      gatewayId: nanoid(10),
      name,
      location
    });

    res.status(201).json(gateway);
  } catch (err) {
    next(err);
  }
};

/**
 * List all Gateways belonging to the logged-in user.
 */
exports.getUserGateways = async (req, res, next) => {
  try {
    const gateways = await Gateway.find({ user: req.user.userId })
      .sort({ createdAt: -1 });

    res.json(gateways);
  } catch (err) {
    next(err);
  }
};
