const express = require('express');
const { authMiddleware, checkRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  uploadProof,
  getPendingPayments,
  approvePayment,
  rejectPayment
} = require('../controllers/paymentController');

const router = express.Router();

// 1) User uploads manual payment proof
router.post(
  '/payments/manual',
  authMiddleware,
  checkRole('user','admin','superadmin'),
  upload.single('proof'),
  uploadProof
);

// 2) Superadmin: list pending
router.get(
  '/payments/pending',
  authMiddleware,
  checkRole('superadmin'),
  getPendingPayments
);

// 3) Superadmin: approve
router.post(
  '/payments/:userId/approve',
  authMiddleware,
  checkRole('superadmin'),
  approvePayment
);

// 4) Superadmin: reject
router.post(
  '/payments/:userId/reject',
  authMiddleware,
  checkRole('superadmin'),
  rejectPayment
);

module.exports = router;
