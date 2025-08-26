// src/routes/adminUsers.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const PlanPurchase = require('../models/PlanPurchase');
const { authMiddleware, checkRole } = require('../middleware/auth');

/* ----------------- helpers: duration → months + addMonths safely ----------------- */
function parseDurationToMonths(str) {
  const m = String(str || '').match(/(\d+)\s*(year|years|month|months)/i);
  if (!m) return 1;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  return unit.startsWith('year') ? n * 12 : n;
}
function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) d.setDate(0); // month-end safety
  return d;
}

/* ----------------- GET /api/admin/users (list) ----------------- */
router.get('/users', authMiddleware, checkRole('superadmin'), async (req, res) => {
  try {
    let {
      search = '',
      role,
      payment,
      isActive,
      page = 1,
      limit = 20,
      sort = 'createdAt:desc',
    } = req.query;

    page = Number(page) || 1;
    limit = Math.min(Number(limit) || 20, 100);

    const filter = {};
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ name: re }, { email: re }];
    }
    if (role) filter.role = role;
    if (payment === 'true' || payment === 'false') filter.payment = payment === 'true';
    if (isActive === 'true' || isActive === 'false') filter.isActive = isActive === 'true';

    const [sortField, sortDir] = String(sort).split(':');
    const sortObj = { [sortField || 'createdAt']: (sortDir === 'asc' ? 1 : -1) };

    const [items, total] = await Promise.all([
      User.find(filter)
        .select('name email role payment isActive createdAt')
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      items,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    console.error('admin users error:', err);
    res.status(500).json({ message: 'Failed to load users' });
  }
});

/* ----------------- GET /api/admin/users/:id (detail) ----------------- */
router.get('/users/:id', authMiddleware, checkRole('superadmin'), async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id).select('name email role payment isActive createdAt updatedAt');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user });
});

/* ----------------- PATCH /api/admin/users/:id (role/payment/active) ----------------- */
router.patch('/users/:id', authMiddleware, checkRole('superadmin'), async (req, res) => {
  const { id } = req.params;
  const { payment, isActive, role } = req.body;
  const update = {};
  if (typeof payment === 'boolean') update.payment = payment;
  if (typeof isActive === 'boolean') update.isActive = isActive;
  if (role && ['user','admin','superadmin'].includes(role)) update.role = role;

  const user = await User.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })
    .select('name email role payment isActive createdAt updatedAt');

  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ ok: true, user });
});

/* ----------------- GET /api/admin/users/:id/purchases (history) ----------------- */
// e.g. ?status=approved&limit=1  (limit default 50)
router.get('/users/:id/purchases',
  authMiddleware, checkRole('superadmin'),
  async (req, res) => {
    const { id } = req.params;
    const { status, limit = 50 } = req.query;
    const filter = { user: id };
    if (status) filter.status = status;

    const items = await PlanPurchase.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 50, 100))
      .select('_id planName price duration devices proofImageUrl status approvedAt expiresAt createdAt');

    res.json({ purchases: items });
  });

/* ----------------- PATCH /api/admin/purchases/:purchaseId/approve ----------------- */
/* replaces your old approve route */
router.patch('/purchases/:purchaseId/approve',
  authMiddleware, checkRole('superadmin'),
  async (req, res) => {
    const { purchaseId } = req.params;

    // load the purchase so we can compute expiry from its duration
    const doc = await PlanPurchase.findById(purchaseId);
    if (!doc) return res.status(404).json({ message: 'Purchase not found' });

    // already approved? just return info
    if (doc.status === 'approved') {
      return res.json({
        ok: true,
        purchase: {
          id: doc._id,
          status: doc.status,
          approvedAt: doc.approvedAt,
          expiresAt: doc.expiresAt,
          proofImageUrl: doc.proofImageUrl,
        }
      });
    }

    // compute expiry
    const approvedAt = new Date();
    const months = parseDurationToMonths(doc.duration);
    const expiresAt = addMonths(approvedAt, months);

    // update purchase
    doc.status = 'approved';
    doc.approvedAt = approvedAt;
    doc.expiresAt = expiresAt;
    await doc.save();

    // update user flags
    await User.findByIdAndUpdate(doc.user, { $set: { payment: true, isActive: true } });

    res.json({
      ok: true,
      purchase: {
        id: doc._id,
        status: doc.status,
        approvedAt,
        expiresAt,
        proofImageUrl: doc.proofImageUrl,
      },
      userId: doc.user
    });
  });

module.exports = router;
