const AlarmSetting = require('../models/AlarmSetting');

exports.getAlarmSettings = async (req, res) => {
  try {
    const { gatewayId } = req.query;
    if (!gatewayId) {
      return res.status(400).json({ error: "gatewayId is required" });
    }

    const settings = await AlarmSetting.find({ gatewayId }).lean();
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch alarm settings" });
  }
};

exports.saveAlarmSettings = async (req, res) => {
  try {
    const { gatewayId, settings } = req.body;

    if (!gatewayId || !Array.isArray(settings)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    await AlarmSetting.deleteMany({ gatewayId });

    await AlarmSetting.insertMany(
      settings.map(s => ({
        gatewayId,
        category: s.category,
        subcategory: s.subcategory,
        high: s.high,
        low: s.low,
        priority: s.priority,
        message: s.message,
      }))
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save settings" });
  }
};
