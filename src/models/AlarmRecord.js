const mongoose = require("mongoose");
const AlarmRecordSchema = new mongoose.Schema({
  gatewayId:   { type: String, required: true },
  timestamp:   { type: Date,   required: true },
  category:    { type: String, required: true },
  subcategory: { type: String, required: true },
  value:       { type: Number, required: true },
  priority:    { type: String, enum: ["High","Normal","Low"], required: true },
  message:     { type: String, default: "" },  // naya field
});
module.exports = mongoose.model("AlarmRecord", AlarmRecordSchema);
