// src/routes/Purchase.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const { authMiddleware, checkRole } = require('../middleware/auth'); // must export a function
const PlanPurchase = require('../models/PlanPurchase');  // ensure this file exists

const router = express.Router();

// Ensure upload dir exists: src/uploads/proofs
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'proofs');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const ok = /^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype);
  if (ok) return cb(null, true);
  return cb(new Error('Only image files are allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// small helper: POSIX-style relative path
const relProofPath = (filename) => ['uploads', 'proofs', filename].join('/');

// ✅ build absolute URL using env or request
const getPublicBase = (req) =>
  (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

// QUICK health
router.get('/health', (req, res) => res.json({ ok: true }));

// POST /api/purchases  (multipart/form-data, field: 'proof')
router.post(
  '/',
  authMiddleware,
  (req, res, next) => {
    upload.single('proof')(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Payment proof image is required' });
      }

      const base = getPublicBase(req); // e.g. http://localhost:3000  OR https://api.yourdomain.com
      const relPath = relProofPath(req.file.filename); // uploads/proofs/xxx.png
      const publicUrl = `${base}/${relPath}`;

      const toNum = (v, d = 0) =>
        v === undefined || v === null || v === '' ? d : Number(v);

      const doc = await PlanPurchase.create({
        user: req.user.userId, // ✅ sirf userId use kar rahe
        planName: String(req.body.planName || ''),
        price: toNum(req.body.price),
        duration: String(req.body.duration || ''),
        devices: toNum(req.body.devices, 1),
        basePrice: toNum(req.body.basePrice),
        discountAmount: toNum(req.body.discountAmount),
        discountPercent: toNum(req.body.discountPercent),
        proofImagePath: relPath,  // relative on disk
        proofImageUrl: publicUrl, // ✅ ABSOLUTE URL for frontend
        status: 'pending',
      });

      return res.status(201).json({
        ok: true,
        id: doc._id,
        status: doc.status,
        proof: doc.proofImageUrl,
      });
    } catch (err) {
      console.error('purchase error:', err);
      if (err?.name === 'ValidationError') {
        return res.status(400).json({ message: err.message });
      }
      return res.status(500).json({ message: 'Failed to save purchase' });
    }
  }
);

// GET /api/purchases/mine?limit=1&sort=createdAt:desc
router.get('/mine', authMiddleware, async (req, res) => {
  const { limit = 50, sort = 'createdAt:desc' } = req.query;
  const [field, dir] = String(sort).split(':');
  const items = await PlanPurchase.find({ user: req.user.userId })
    .sort({ [field || 'createdAt']: dir === 'asc' ? 1 : -1 })
    .limit(Math.min(Number(limit) || 50, 100))
    .select('_id planName price duration devices status proofImageUrl createdAt');
  res.json({ items });
});

module.exports = router;
