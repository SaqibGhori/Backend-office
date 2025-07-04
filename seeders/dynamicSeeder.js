const ReadingDynamic = require('../src/models/ReadingDynamic');
const gateways = ['gateway-001', 'gateway-002', 'gateway-003'];
const intervalMs = Number(process.env.SEED_INTERVAL_MS) || 1000;

console.log('🔧 Seeder active, interval:', intervalMs);

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
  console.log('💾 Seeded dynamic reading:', doc);
} catch (e) {
  console.error('❌ Seeder error:', e);
}
}, intervalMs);
