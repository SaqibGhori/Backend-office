require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const port = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

// Enable body parsing
app.use(express.json());

// CORS setup
app.use(
  cors({
    origin: isDev ? 'http://localhost:5173' : 'https://your-production-domain.com',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  })
);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('❌ Connection error:', err);
    process.exit(1);
  });

// ReadingDynamic schema/model
const readingSchemaDynamic = new mongoose.Schema({
  gatewayId: String,
  timestamp: String,
  data: mongoose.Schema.Types.Mixed,
});
const ReadingDynamic = mongoose.models.Readingdynamic || mongoose.model('Readingdynamic', readingSchemaDynamic);

// HTTP + Socket.IO setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST'] }
});
io.on('connection', socket => {
  
  console.log('✅ New client connected:', socket.id);
});

if (isDev) {
  console.log('🔧 Seeder active in development mode');
  const gateways = ['gateway-001', 'gateway-002', 'gateway-003'];

  setInterval(async () => {
    try {
      // Rotate gatewayId randomly
      const gatewayId = gateways[Math.floor(Math.random() * gateways.length)];
      const timestamp = new Date().toISOString();

      // Construct data object
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
      };

      const doc = await ReadingDynamic.create({ gatewayId, timestamp, data });
      console.log('💾 Seeded dynamic reading:', doc);
    } catch (e) {
      console.error('❌ Seeder error:', e);
    }
  }, 1000);
}

// ChangeStream → emit on insert
function startChangeStream() {
  const stream = ReadingDynamic.watch([{ $match: { operationType: 'insert' } }]);
  stream.on('change', ({ fullDocument }) => io.emit('new-reading', fullDocument));
  stream.on('error', err => {
    console.error('⚠️ ChangeStream error:', err);
    stream.close();
    setTimeout(startChangeStream, 5000);
  });
  return stream;
}
startChangeStream();

// REST endpoints
app.get('/api/readingsdynamic', async (req, res) => {
  try {
    const { gatewayId, startDate, endDate } = req.query;
    const filter = {};
    if (gatewayId) filter.gatewayId = gatewayId;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = startDate;
      if (endDate) filter.timestamp.$lte = endDate;
    }
    const results = await ReadingDynamic.find(filter)
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
    return res.json(results);
  } catch (err) {
    console.error('❌ Error in /api/readingsdynamic:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});
app.get('/api/gateways', async (req, res) => {
  try {
    const gateways = await ReadingDynamic.distinct('gatewayId');
    res.json(gateways);            
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Start server
server.listen(port, () => {
  console.log(`🚀 Server + WebSocket listening on port ${port}`);
});
