const express = require('express');
const router = express.Router();
const User = require('../models/User');
const PlanPurchase = require('../models/PlanPurchase');
const { authMiddleware, checkRole } = require('../middleware/auth');


// GET /api/admin/users?search=&role=&payment=&isActive=&page=1&limit=20&sort=createdAt:desc
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


// GET /api/admin/users/:id  -> single user detail
router.get('/users/:id', authMiddleware, checkRole('superadmin'), async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id).select('name email role payment isActive createdAt updatedAt');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user });
});

// PATCH /api/admin/users/:id  -> update user fields (payment/isActive/role)
router.patch('/users/:id', authMiddleware, checkRole('superadmin'), async (req, res) => {
  const { id } = req.params;
  const { payment, isActive, role } = req.body; // only allowed fields
  const update = {};
  if (typeof payment === 'boolean') update.payment = payment;
  if (typeof isActive === 'boolean') update.isActive = isActive;
  if (role && ['user','admin','superadmin'].includes(role)) update.role = role;

  const user = await User.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })
    .select('name email role payment isActive createdAt updatedAt');

  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ ok: true, user });
});

// GET /api/admin/users/:id/purchases?status=pending  -> user purchases
router.get('/users/:id/purchases', authMiddleware, checkRole('superadmin'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.query;
  const filter = { user: id };
  if (status) filter.status = status;
  const purchases = await PlanPurchase.find(filter)
    .sort({ createdAt: -1 })
    .select('_id planName price duration devices proofImageUrl status createdAt');
  res.json({ purchases });
});

// PATCH /api/admin/purchases/:purchaseId/approve  -> approve specific purchase + set user.payment=true
router.patch('/purchases/:purchaseId/approve', authMiddleware, checkRole('superadmin'), async (req, res) => {
  const { purchaseId } = req.params;
  const doc = await PlanPurchase.findByIdAndUpdate(purchaseId, { $set: { status: 'approved' } }, { new: true });
  if (!doc) return res.status(404).json({ message: 'Purchase not found' });

  await User.findByIdAndUpdate(doc.user, { $set: { payment: true, isActive: true } });
  res.json({ ok: true, purchase: { id: doc._id, status: doc.status }, userId: doc.user });
});


module.exports = router;
