const mongoose = require("mongoose");

const AlarmSettingSchema = new mongoose.Schema({
  gatewayId:   { type: String, required: true },
  category:    { type: String, required: true },
  subcategory: { type: String, required: true },
  high:        { type: Number, default: 0 },
  low:         { type: Number, default: 0 },
  priority:    { type: String, enum: ["High","Normal","Low"], default: "Normal" },
  message:     { type: String, default: "" },  // naya field
});

module.exports = mongoose.model("AlarmSetting", AlarmSettingSchema);
