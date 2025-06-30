const ReadingDynamic = require('../src/models/ReadingDynamic');
const gateways = ['gateway-001','gateway-002','gateway-003'];
const intervalMs = Number(process.env.SEED_INTERVAL_MS) || 1000;

console.log('🔧 Seeder active, interval:', intervalMs);

setInterval(async () => {
  try {
    const gatewayId = gateways[Math.floor(Math.random()*gateways.length)];
    const timestamp = new Date().toISOString();
    const data = {
      Voltage: { VL1: Math.floor(300+Math.random()*200), VL2: Math.floor(300+Math.random()*200), VL3: Math.floor(300+Math.random()*200) },
      'Active Power': { L1: Math.floor(400+Math.random()*200), L2: Math.floor(400+Math.random()*200), L3: Math.floor(400+Math.random()*200) },
      'Power Factor': { PF1: parseFloat((0.8+Math.random()*0.2).toFixed(2)), PF2: parseFloat((0.8+Math.random()*0.2).toFixed(2)), PF3: parseFloat((0.8+Math.random()*0.2).toFixed(2)) }
    };
    const doc = await ReadingDynamic.create({ gatewayId, timestamp, data });
    console.log('💾 Seeded dynamic reading:', doc);
  } catch (e) {
    console.error('❌ Seeder error:', e);
  }
}, intervalMs);
