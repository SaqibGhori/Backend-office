// src/models/User.js
const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['user','admin','superadmin'], default: 'user' },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

// Virtual setter: captures the plain password
userSchema.virtual('password').set(function (pwd) {
  this._plainPassword = pwd;
});

// **MUST** be `validate`, not `save`, so it runs before required checks
userSchema.pre('validate', async function (next) {
  if (this._plainPassword) {
    try {
      this.passwordHash = await bcrypt.hash(this._plainPassword, SALT_ROUNDS);
      this._plainPassword = undefined;
    } catch (e) {
      return next(e);
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
