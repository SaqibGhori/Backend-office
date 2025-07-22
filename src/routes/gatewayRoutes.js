const express = require('express');
const GatewayMeta = require('../models/GatewayMeta');
const router = express.Router();

// GET /api/gateways-meta
router.get('/', async (req, res) => {
  try {
    const list = await GatewayMeta.find().lean();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/gateways-meta/:gatewayId
router.patch('/:gatewayId', async (req, res) => {
  const { gatewayId } = req.params;
  const { displayName } = req.body;
  if (!displayName?.trim()) {
    return res.status(400).json({ error: 'displayName required' });
  }
  try {
    const meta = await GatewayMeta.findOneAndUpdate(
      { gatewayId },
      { $set: { displayName: displayName.trim() } },
      { upsert: true, new: true }
    );
    // broadcast to all sockets
    const io = req.app.get('io');
    if (io) io.emit('gateway_alias_updated', { gatewayId, displayName: meta.displayName });
    res.json(meta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
