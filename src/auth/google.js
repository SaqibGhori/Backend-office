// src/auth/google.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Normalize env values (trim hidden spaces/newlines)
const GOOGLE_CLIENT_ID     = String(process.env.GOOGLE_CLIENT_ID || '').trim();
const GOOGLE_CLIENT_SECRET = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();
const GOOGLE_CALLBACK_URL  = String(process.env.GOOGLE_CALLBACK_URL || '').trim();

// Debug once at startup
console.log('GOOGLE_OAUTH_DEBUG', {
  idPrefix: GOOGLE_CLIENT_ID.slice(0, 14),
  callback: GOOGLE_CALLBACK_URL
});

passport.use(new GoogleStrategy(
  {
    clientID:     GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL:  GOOGLE_CALLBACK_URL,
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      const name  = profile.displayName || 'Google User';
      if (!email) return done(null, false, { message: 'No email from Google' });

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
      return done(err);
    }
  }
));

module.exports = passport;
