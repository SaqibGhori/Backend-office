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

// Dynamic Reading schema/model
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

// Handle socket connections and room subscriptions
io.on('connection', socket => {
  console.log(`🆔 Client connected: ${socket.id}`);

  // Listen for subscription requests to specific gateway rooms
  socket.on('subscribe', gatewayId => {
    // Leave any previous gateway rooms
    Array.from(socket.rooms)
      .filter(r => r.startsWith('gateway-'))
      .forEach(r => socket.leave(r));

    // Join the requested gateway room
    socket.join(gatewayId);
    console.log(`🔔 ${socket.id} subscribed to room: ${gatewayId}`);
  });
});

if (isDev) {
  console.log('🔧 Seeder active in development mode');
  const gateways = ['gateway-001', 'gateway-002', 'gateway-003'];

  setInterval(async () => {
    try {
      // Randomly pick a gateway
      const gatewayId = gateways[Math.floor(Math.random() * gateways.length)];
      const timestamp = new Date().toISOString();

      // Construct nested data object
      const data = {
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
        'Appanrent Power': {
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

      // Save to DB
      const doc = await ReadingDynamic.create({ gatewayId, timestamp, data });
      console.log('💾 Seeded dynamic reading:', doc);
    } catch (e) {
      console.error('❌ Seeder error:', e);
    }
  }, 1000);
}

// ChangeStream: emit new readings to corresponding gateway room
function startChangeStream() {
  const stream = ReadingDynamic.watch([{ $match: { operationType: 'insert' } }]);

  stream.on('change', ({ fullDocument }) => {
    const room = fullDocument.gatewayId;
    io.to(room).emit('new-reading', fullDocument);
  });

  stream.on('error', err => {
    console.error('⚠️ ChangeStream error:', err);
    stream.close();
    setTimeout(startChangeStream, 5000);
  });

  return stream;
}
startChangeStream();

// REST endpoint: list gateways
app.get('/api/gateways', async (req, res) => {
  try {
    const list = await ReadingDynamic.distinct('gatewayId');
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST endpoint: fetch dynamic readings (optional query filtering)
app.get('/api/readingsdynamic', async (req, res) => {
  try {
    const { gatewayId, startDate, endDate } = req.query;
    const filter = {};
    if (gatewayId) filter.gatewayId = gatewayId;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = startDate;
      if (endDate)   filter.timestamp.$lte = endDate;
    }
    const results = await ReadingDynamic.find(filter)
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Start server
server.listen(port, () => {
  console.log(`🚀 Server + WebSocket listening on port ${port}`);
});
