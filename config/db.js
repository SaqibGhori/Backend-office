const mongoose = require('mongoose');

module.exports = function connectDB(uri) {
  return mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
};
