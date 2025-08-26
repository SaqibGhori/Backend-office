// scripts/backfill-proof-urls.js
require('dotenv').config();
const mongoose = require('mongoose');

// 👇 path project structure ke hisaab se hai (root -> src -> models)
const PlanPurchase = require('../src/models/PlanPurchase');

(async function run() {
  try {
    const mongo =
      process.env.MONGODB_URI 
      
    await mongoose.connect(mongo);
    const base = (process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

    const rels = await PlanPurchase.find({
      $or: [
        { proofImageUrl: { $exists: false } },
        { proofImageUrl: { $not: /^https?:\/\//i } }, // not absolute
      ],
    }).select('_id proofImagePath proofImageUrl');

    let updated = 0;
    for (const d of rels) {
      const rel = d.proofImagePath || d.proofImageUrl;
      if (!rel) continue;
      const absolute = `${base}/${String(rel).replace(/^\//, '')}`;
      await PlanPurchase.updateOne({ _id: d._id }, { $set: { proofImageUrl: absolute } });
      updated++;
    }

    console.log(`Backfill complete: ${updated}/${rels.length} documents updated.`);
  } catch (e) {
    console.error('Backfill failed:', e);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
})();
