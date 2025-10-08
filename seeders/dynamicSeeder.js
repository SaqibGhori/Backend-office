// dynamicSeeder.js
require('dotenv').config();              // ① load your .env early
const User           = require('../src/models/User');
const ReadingDynamic = require('../src/models/ReadingDynamic');
const Gateway = require('../src/models/Gateway');
const intervalMs = Number(process.env.SEED_INTERVAL_MS) || 1000;
console.log('🔧 Seeder active, interval:', intervalMs);

setInterval(async () => {
  try {
    const allGateways = await Gateway.find({});
    if (!allGateways.length) return;

    // Random gateway pick
    const randomGateway = allGateways[Math.floor(Math.random() * allGateways.length)];
    const gatewayId = randomGateway.gatewayId;
    const gatewayName = randomGateway.gatewayName;
    const userId = randomGateway.user;
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
        T3: Math.floor(Math.random() * 100),
      },
      Humidity: {
        H1: Math.floor(Math.random() * 100),
        H2: Math.floor(Math.random() * 100),
        H3: Math.floor(Math.random() * 100),
      }
    };

    await ReadingDynamic.create({
      gatewayId,
      userId,
      gatewayName,
      timestamp,
      data
    });

console.log("🔁 Seeding for:", { gatewayId, userId, gatewayName  ,data });
  } catch (err) {
    console.error('Seeder Error:', err.message);
  }
}, intervalMs);
