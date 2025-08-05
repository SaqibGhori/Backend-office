const mongoose = require("mongoose");
const AlarmSetting = require('../models/AlarmSetting');

exports.getAlarmSettings = async (req, res) => {
  try {
    const { gatewayId } = req.query;
    const userId = new mongoose.Types.ObjectId(req.user.userId)

    if (!gatewayId || !userId) {
      return res.status(400).json({ error: "gatewayId and userId are required" });
    }

    const settings = await AlarmSetting.find({ gatewayId, userId }).lean();
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch alarm settings" });
  }
};

exports.saveAlarmSettings = async (req, res) => {
  try {
    const { gatewayId, settings } = req.body;
    const userId = req.user.userId;

    if (!gatewayId || !Array.isArray(settings) || !userId) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    // Delete old settings for this user and gateway
    await AlarmSetting.deleteMany({ gatewayId, userId });

    // Save new ones
    const entries = settings.map(s => ({
      userId,
      gatewayId,
      category: s.category,
      subcategory: s.subcategory,
      high: s.high,
      low: s.low,
      priority: s.priority,
      message: s.message,
    }));

    await AlarmSetting.insertMany(entries);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save settings" });
  }
};
