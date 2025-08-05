const mongoose = require('mongoose');

const readingSchema = new mongoose.Schema({
  gatewayId: String,
  userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true
},
  timestamp: String,
  data: mongoose.Schema.Types.Mixed,
});

module.exports = mongoose.models.ReadingDynamic ||
  mongoose.model('ReadingDynamic', readingSchema, 'readingdynamics');
