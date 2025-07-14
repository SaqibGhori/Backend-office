// models/ReadingDynamic.js
const mongoose = require("mongoose");

const ReadingDynamicSchema = new mongoose.Schema({
  gatewayId: String,
  timestamp: Date,
  data: mongoose.Schema.Types.Mixed // can be improved if structure is known
});

module.exports = mongoose.model("ReadingDynamic", ReadingDynamicSchema);
