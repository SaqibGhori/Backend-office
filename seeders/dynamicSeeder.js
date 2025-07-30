// dynamicSeeder.js
require('dotenv').config();              // ① load your .env early
const User           = require('../src/models/User');
const ReadingDynamic = require('../src/models/ReadingDynamic');

// ─── 1️⃣ Superadmin seeder (runs once at startup) ─────────────────
;(async () => {
  try {
    const exists = await User.countDocuments({ role: 'superadmin' });
    if (exists === 0) {
      await User.create({
        name:     process.env.SUPERADMIN_NAME,
        email:    process.env.SUPERADMIN_EMAIL,
        password: process.env.SUPERADMIN_PASSWORD,
        role:     'superadmin',
        isActive: true
      });
      console.log('🌱 Superadmin seeded:', process.env.SUPERADMIN_EMAIL);
    } else {
      console.log('✅ Superadmin already exists, skipping seed');
    }
  } catch (err) {
    console.error('❌ Superadmin seeder error:', err);
  }
})();

// ─── 2️⃣ Reading seeder (runs repeatedly on an interval) ─────────
const gateways   = ['gateway-001', 'gateway-002', 'gateway-003'];
const intervalMs = Number(process.env.SEED_INTERVAL_MS) || 1000;

console.log('🔧 ReadingSeeder active, interval:', intervalMs, 'ms');

setInterval(async () => {
  try {
    const gatewayId = gateways[Math.floor(Math.random() * gateways.length)];
    const timestamp = new Date().toISOString();
    const data = {
      Voltage: {
        VL1: Math.floor(Math.random() * 100),
        VL2: Math.floor(Math.random() * 100),
        VL3: Math.floor(Math.random() * 100),
      },
      'Active Power': {
        L1: Math.floor(Math.random() * 100),
        L2: Math.floor(Math.random() * 100),
        L3: Math.floor(Math.random() * 100),
      },
      'Power Factor': {
        PF1: Math.floor(Math.random() * 100),
        PF2: Math.floor(Math.random() * 100),
        PF3: Math.floor(Math.random() * 100),
      },
      Temperature: {
        T1: Math.floor(Math.random() * 100),
        T2: Math.floor(Math.random() * 100),
      },
      Humidity: {
        H1: Math.floor(Math.random() * 100),
        H2: Math.floor(Math.random() * 100),
      },
    };

    const doc = await ReadingDynamic.create({ gatewayId, timestamp, data });
    console.log('💾 Seeded dynamic reading:', JSON.stringify(doc.toObject(), null, 2));
  } catch (e) {
    console.error('❌ Seeder error:', e);
  }
}, intervalMs);
