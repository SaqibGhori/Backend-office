const User = require('../models/User');
const nodemailer = require('nodemailer');

// Configure mailer (set these in .env)
const transporter = nodemailer.createTransport({
  host:     process.env.EMAIL_HOST,
  port:     process.env.EMAIL_PORT,
  secure:   false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 4.1 User uploads proof
exports.uploadProof = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'Proof image is required' });
    }
    const { gatewaysPurchased, subscriptionDurationDays } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.gatewaysPurchased = Number(gatewaysPurchased);
    user.subscriptionDurationDays = Number(subscriptionDurationDays);
    user.paymentProof = req.file.path;
    user.paymentStatus = 'pending';
    await user.save();

    res.json({ msg: 'Proof uploaded. Awaiting approval.' });
  } catch (err) {
    next(err);
  }
};

// 4.2 Superadmin views all pending proofs
exports.getPendingPayments = async (req, res, next) => {
  try {
    const pending = await User.find({ paymentStatus: 'pending' })
      .select('name email gatewaysPurchased subscriptionDurationDays paymentProof createdAt');
    res.json(pending);
  } catch (err) {
    next(err);
  }
};

// 4.3 Superadmin approves a user
exports.approvePayment = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const now = new Date();
    const end = new Date(now.getTime() + user.subscriptionDurationDays * 24*60*60*1000);

    user.subscriptionStart = now;
    user.subscriptionEnd   = end;
    user.isActive          = true;
    user.paymentStatus     = 'approved';
    await user.save();

    // Notify user by email
    await transporter.sendMail({
      from:    process.env.EMAIL_FROM,
      to:      user.email,
      subject: 'Subscription Approved',
      text:    `Hi ${user.name},\n\nYour subscription has been approved! It’s valid until ${end.toDateString()}.\n\nThank you.`
    });

    res.json({ msg: 'User approved and notified.' });
  } catch (err) {
    next(err);
  }
};

// 4.4 Superadmin rejects a proof
exports.rejectPayment = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.paymentStatus = 'rejected';
    await user.save();

    // Notify user by email
    await transporter.sendMail({
      from:    process.env.EMAIL_FROM,
      to:      user.email,
      subject: 'Subscription Rejected',
      text:    `Hi ${user.name},\n\nUnfortunately your payment proof was rejected. Please try again or contact support.\n`
    });

    res.json({ msg: 'User rejected and notified.' });
  } catch (err) {
    next(err);
  }
};
