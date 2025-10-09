const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');

// GET /api/me  -> logged-in user basics
router.get('/me', authMiddleware, async (req, res) => {
  const u = await User.findById(req.user.userId)
    .select('name email role payment isActive createdAt updatedAt');
  if (!u) return res.status(404).json({ message: 'User not found' });
  res.json({ user: u });
});


module.exports = router;
