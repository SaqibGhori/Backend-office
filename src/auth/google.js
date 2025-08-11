// src/auth/google.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL,
}, async (_accessToken, _refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    const name  = profile.displayName || 'Google User';

    if (!email) return done(null, false, { message: 'No email from Google' });

    // find or create
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        provider: 'google',
        role: 'user',
        isActive: true,
      });
    }
    return done(null, user);
  } catch (err) {
    done(err);
  }
}));

module.exports = passport;
