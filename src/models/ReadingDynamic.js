const mongoose = require('mongoose');

const readingSchema = new mongoose.Schema({
  gatewayId: String,
  timestamp: String,
  data: mongoose.Schema.Types.Mixed,
});

module.exports = mongoose.models.Readingdynamic ||
  mongoose.model('Readingdynamic', readingSchema);
