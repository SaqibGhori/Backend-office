// src/controllers/payfastController.js
const stripe = require('../config/stripe');
const User   = require('../models/User');
const crypto = require('crypto');

exports.createCheckoutSession = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { gatewaysPurchased, subscriptionDurationDays } = req.body;
    const domainURL = process.env.FRONTEND_URL;

    const amount = gatewaysPurchased * 1000; // e.g. $10 per gateway

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `${gatewaysPurchased}-Gateway Plan` },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${domainURL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${domainURL}/payment-cancel`,
      metadata: { userId, gatewaysPurchased, subscriptionDurationDays }
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
};

exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, sig, process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, gatewaysPurchased, subscriptionDurationDays } = session.metadata;
    const user = await User.findById(userId);
    if (user) {
      const now = new Date();
      const end = new Date(now.getTime() + subscriptionDurationDays * 24*60*60*1000);
      user.gatewaysPurchased  = Number(gatewaysPurchased);
      user.subscriptionStart  = now;
      user.subscriptionEnd    = end;
      user.isActive           = true;
      user.paymentStatus      = 'approved';
      await user.save();
    }
  }
  res.json({ received: true });
};
