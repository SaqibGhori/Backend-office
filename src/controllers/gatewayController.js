// src/controllers/GatewayController.js
const Gateway = require('../models/Gateway');
const PlanPurchase = require('../models/PlanPurchase');
const { nanoid } = require('nanoid');

/**
 * Create a new Gateway (device) for the logged-in user.
 * Enforces active plan + device limit.
 * Expects { name, location, gatewayId? } in req.body.
 */
exports.updateGateway = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { gatewayName, location } = req.body;

    if (!gatewayName && !location) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const gateway = await Gateway.findOneAndUpdate(
      { _id: id, user: req.user.userId },
      {
        ...(gatewayName ? { gatewayName: String(gatewayName).trim() } : {}),
        ...(location ? { location: String(location).trim() } : {}),
      },
      { new: true }
    );

    if (!gateway) return res.status(404).json({ message: "Gateway not found" });
    res.json(gateway);
  } catch (err) {
    next(err);
  }
};

// ✅ Delete — only own gateway
exports.deleteGateway = async (req, res, next) => {
  try {
    const id = req.params.id;

    const deleted = await Gateway.findOneAndDelete({
      _id: id,
      user: req.user.userId,
    });

    if (!deleted) return res.status(404).json({ message: "Gateway not found" });

    // NOTE: agar readings cascade delete chahiye to yahan handle karein.
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};
exports.createGateway = async (req, res, next) => {
  try {
    const { gatewayName, location } = req.body;
    if (!gatewayName || !location) {
      return res.status(400).json({ message: 'Name and location are required' });
    }

    // 1) How many devices already created by this user?
    const used = await Gateway.countDocuments({ user: req.user.userId });

    // 2) Find latest approved plan (active subscription)
    const plan = await PlanPurchase.findOne({
      user: req.user.userId,
      status: 'approved',
    })
      .sort({ approvedAt: -1, createdAt: -1 })
      .select('devices expiresAt');

    if (!plan) {
      return res.status(403).json({
        message: 'No active plan. Please purchase a plan first.',
        used,
        limit: 0,
        remaining: 0,
      });
    }

    // 3) Expiry check
    if (plan.expiresAt && plan.expiresAt < new Date()) {
      return res.status(403).json({
        message: 'Your plan has expired. Renew to add devices.',
        used,
        limit: plan.devices ?? 0,
        remaining: 0,
      });
    }

    const limit = plan.devices ?? 0;

    // 4) Hard limit enforcement
    if (limit && used >= limit) {
      return res.status(403).json({
        message: 'Device limit exceeded',
        used,
        limit,
        remaining: 0,
      });
    }

    // 5) Create device (use FE-provided gatewayId if present else generate)
    const gateway = await Gateway.create({
      user: req.user.userId,
      gatewayId: req.body.gatewayId || nanoid(10),
      gatewayName,
      location,
    });

    // Optionally include usage meta (safe: FE can ignore)
    const nowUsed = used + 1;
    const remaining = limit ? Math.max(limit - nowUsed, 0) : null;

    res.status(201).json({
      gateway,
      usage: { used: nowUsed, limit, remaining },
    });
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
