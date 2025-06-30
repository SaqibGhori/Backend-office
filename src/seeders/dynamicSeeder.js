// src/seeders/dynamicSeeder.js
const Reading = require('../models/Reading');

const gateways = ['gateway-001', 'gateway-002', 'gateway-003'];
const interval = Number(process.env.SEED_INTERVAL_MS) || 1000;

console.log('🔧 Seeder: interval set to', interval, 'ms');

setInterval(async () => {
  try {
    const gatewayId = gateways[Math.floor(Math.random() * gateways.length)];
    const data = {
      'Voltage': {
        VL1: Math.floor(300 + Math.random() * 200),
        VL2: Math.floor(300 + Math.random() * 200),
        VL3: Math.floor(300 + Math.random() * 200),
      },
      'Active Power': {
        L1: Math.floor(400 + Math.random() * 200),
        L2: Math.floor(400 + Math.random() * 200),
        L3: Math.floor(400 + Math.random() * 200),
      },
      'Power Factor': {
        PF1: parseFloat((0.8 + Math.random() * 0.2).toFixed(2)),
        PF2: parseFloat((0.8 + Math.random() * 0.2).toFixed(2)),
        PF3: parseFloat((0.8 + Math.random() * 0.2).toFixed(2)),
      },
      'Voltage(L-N)': {
        VL1: parseFloat((0.8 + Math.random() * 0.2).toFixed(2)),
        VL2: parseFloat((0.8 + Math.random() * 0.2).toFixed(2)),
        VL3: parseFloat((0.8 + Math.random() * 0.2).toFixed(2)),
      },
      'Current': {
        IL1: parseFloat((0.8 + Math.random() * 0.2).toFixed(2)),
        IL2: parseFloat((0.8 + Math.random() * 0.2).toFixed(2)),
        IL3: parseFloat((0.8 + Math.random() * 0.2).toFixed(2)),
      },
      'Frequency': {
        FL1: parseFloat((0.8 + Math.random() * 0.2).toFixed(2)),
        FL2: parseFloat((0.8 + Math.random() * 0.2).toFixed(2)),
        FL3: parseFloat((0.8 + Math.random() * 0.2).toFixed(2)),
      },
      'Apparent Power': {
        SL1: parseFloat((0.8 + Math.random() * 0.2).toFixed(2)),
        SL2: parseFloat((0.8 + Math.random() * 0.2).toFixed(2)),
        SL3: parseFloat((0.8 + Math.random() * 0.2).toFixed(2)),
      },
      'Cos': {
        Cos1: parseFloat((0.8 + Math.random() * 0.2).toFixed(2)),
        Cos2: parseFloat((0.8 + Math.random() * 0.2).toFixed(2)),
        Cos3: parseFloat((0.8 + Math.random() * 0.2).toFixed(2)),
      }
    };

    const doc = await Reading.create({ gatewayId, data });
    console.log('💾 Seeder: seeded', gatewayId, 'with data:', data);
  } catch (err) {
    console.error('❌ Seeder error:', err);
  }
}, interval);
