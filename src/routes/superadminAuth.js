// src/routes/superadminAuth.js
const router = require('express').Router();
const { register, login } = require('../controllers/authController');

// Force role = “superadmin” on signup
router.post('/signup', (req, res, next) => {
  req.body.role = 'superadmin';
  register(req, res, next);
});

// Regular login (any role)
router.post('/login', login);

module.exports = router;
