// src/routes/payfastRoutes.js
const router = require('express').Router();
const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const {
  createPayFastTransaction,
  handlePayFastNotify
} = require('../controllers/payfastController');

// 1) Initiate PayFast transaction (must be logged in)
router.post(
  '/payments/payfast-initiate',
  authMiddleware,
  createPayFastTransaction
);

// 2) IPN callback from PayFast (public endpoint)
router.post(
  '/payments/payfast-notify',
  express.urlencoded({ extended: true }),
  handlePayFastNotify
);

module.exports = router;
