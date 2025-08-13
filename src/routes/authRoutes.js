// src/routes/authRoutes.js
const express = require('express');
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const passport = require('../auth/google'); 
const { register, login } = require('../controllers/authController');

const router = express.Router();

/* -------- Email/password auth -------- */
router.post(
  '/register',
  [
    body('name').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars')
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').exists()
  ],
  login
);

/* -------- Google OAuth -------- */
// Step 1: Kick off Google login
router.get(
  '/google',
  passport.authenticate('google', {
    session: false,
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

// Step 2: Google redirects back here
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?google=fail`,
  }),
  (req, res) => {
    // req.user is set by the Google strategy (should be a User document)
    const user = req.user;

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Option A: redirect back to FE with token (using hash to avoid logs)
   const redirectUrl =
  `${process.env.FRONTEND_URL || 'http://localhost:5173'}` +
  `/login?token=${encodeURIComponent(token)}&role=${user.role}&email=${encodeURIComponent(user.email)}`;

    // Option B (useful for Postman): return JSON when ?format=json
    if (req.query.format === 'json') {
      return res.json({ token, role: user.role, email: user.email });
    }

    return res.redirect(redirectUrl);
  }
);

module.exports = router;
