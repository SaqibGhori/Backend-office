const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const planPurchaseSchema = new Schema({
  user: { type: Types.ObjectId, ref: 'User', required: true },
  planName: { type: String, required: true },           // Monthly | Custom | Yearly
  price: { type: Number, required: true },              // final price after discount
  duration: { type: String, required: true },           // e.g. "1 Month" | "1 Year" | "6 Months"
  devices: { type: Number, default: 1 },

  basePrice: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  discountPercent: { type: Number, default: 0 },

  // uploaded proof
  proofImagePath: { type: String, required: true },     // local path e.g. uploads/proofs/abc.png
  proofImageUrl: { type: String },                      // optional: if you serve statically

  // approval flow (optional)
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('PlanPurchase', planPurchaseSchema);