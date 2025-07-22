const mongoose = require('mongoose');

const GatewayMetaSchema = new mongoose.Schema({
  gatewayId:   { type: String, required: true, unique: true, index: true },
  displayName: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.models.GatewayMeta ||
  mongoose.model('GatewayMeta', GatewayMetaSchema);
