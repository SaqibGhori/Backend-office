// src/models/User.js
const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema({
  name:  { type: String, required: true },
  email: { type: String, required: true, unique: true },

  // Only required for local (email+password) users
  passwordHash: {
    type: String,
    required: function () {
      return this.provider !== 'google';   // local/admin must have a password
    }
  },

  // Who created/owns this account type
  provider: { type: String, enum: ['local', 'google'], default: 'local' },

  role:     { type: String, enum: ['user','admin','superadmin'], default: 'user' },
  
  // NEW: payment flag for normal users (defaults to false on signup)
  payment:  { type: Boolean, default: false },
  
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

/**
 * Virtual setter: you can do `user.password = 'plain'`
 * It doesn't persist directly; we capture it and hash before validation.
 */
userSchema.virtual('password').set(function (pwd) {
  this._plainPassword = pwd;
});

/**
 * Hash the plain password before validation so the `required` check on
 * passwordHash passes for local users. (Works for create & update.)
 */
userSchema.pre('validate', async function (next) {
  if (this._plainPassword) {
    try {
      this.passwordHash = await bcrypt.hash(this._plainPassword, SALT_ROUNDS);
      this._plainPassword = undefined;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
