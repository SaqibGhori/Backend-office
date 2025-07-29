const mongoose = require('mongoose');

const gatewaySchema = new mongoose.Schema({
  gatewayId: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Gateway', gatewaySchema);
