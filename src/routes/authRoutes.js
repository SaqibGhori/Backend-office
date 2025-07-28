const express = require('express');
const { body } = require('express-validator');
const { register, login } = require('../controllers/authController');

const router = express.Router();

// Registration: name, email, password, optional role
router.post(
  '/register',
  [
    body('name').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 })
  ],
  register
);

// Login: email & password
router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').exists()
  ],
  login
);

module.exports = router;
