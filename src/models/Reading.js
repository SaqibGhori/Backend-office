const mongoose = require('mongoose');

const ReadingSchema = new mongoose.Schema({
  gatewayId:  { type: String, required: true },
  timestamp:  { type: Date,   default: Date.now },
  data:       { type: mongoose.Schema.Types.Mixed, required: true },
});

module.exports = mongoose.models.Reading
  || mongoose.model('Reading', ReadingSchema);
