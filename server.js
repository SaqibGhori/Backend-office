// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const port = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

// Helper: parse ISO date strings safely
function parseISODate(str) {
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// Enable CORS
app.use(
  cors({
    origin: isDev ? 'http://localhost:5173' : 'https://your-production-domain.com',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  })
);

// 1) MongoDB connect
//    Ensure your .env mein MONGODB_URI ki value bilkul is format mein ho:
//    MONGODB_URI="mongodb+srv://<user>:<pass>@cluster0.7kq4deg.mongodb.net/mydatabase?retryWrites=true&w=majority"

console.log('🆔 Connecting to MongoDB with URI:', process.env.MONGODB_URI);
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,    // 10s me retry rukega
  socketTimeoutMS: 45000,             // 45s socket timeout
  // new URL parser aur unified topology ab default hain, options pass karne ki zaroorat nahi
})
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('❌ Connection errorss:', err);
    process.exit(1);
  });
// 2) Define Reading schema/model
const readingSchema = new mongoose.Schema({
  voltageLN: { v1: Number, v2: Number, v3: Number },
  voltageLL: { v12: Number, v23: Number, v31: Number },
  current: { i1: Number, i2: Number, i3: Number },
  frequency: { f1: Number, f2: Number, f3: Number },
  activePower: { pl1: Number, pl2: Number, pl3: Number },
  reactivePower: { ql1: Number, ql2: Number, ql3: Number },
  apparentPower: { sl1: Number, sl2: Number, sl3: Number },
  cos: { cosl1: Number, cosl2: Number, cosl3: Number },
  createdAt: { type: Date, default: Date.now, index: true }
});
const Reading = mongoose.model('Reading', readingSchema);

// 3) HTTP + Socket.IO setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST'] }
});
io.on('connection', socket => {
  console.log('✅ New client connected:', socket.id);
});

if (isDev) {
  console.log('🔧 Seeder active in development mode');
  setInterval(async () => {
    try {
      const fake = {
        voltageLN: { v1: +((Math.random() * 100).toFixed(2)), v2: +((Math.random() * 100).toFixed(2)), v3: +((Math.random() * 100).toFixed(2)) },
        voltageLL: { v12: +((Math.random() * 120).toFixed(2)), v23: +((Math.random() * 120).toFixed(2)), v31: +((Math.random() * 120).toFixed(2)) },
        current: { i1: +((Math.random() * 50).toFixed(2)), i2: +((Math.random() * 50).toFixed(2)), i3: +((Math.random() * 50).toFixed(2)) },
        frequency: { f1: +((50 + Math.random() * 10).toFixed(2)), f2: +((50 + Math.random() * 10).toFixed(2)), f3: +((50 + Math.random() * 10).toFixed(2)) },
        activePower: { pl1: +((Math.random() * 100).toFixed(2)), pl2: +((Math.random() * 100).toFixed(2)), pl3: +((Math.random() * 100).toFixed(2)) },
        reactivePower: { ql1: +((Math.random() * 100).toFixed(2)), ql2: +((Math.random() * 100).toFixed(2)), ql3: +((Math.random() * 100).toFixed(2)) },
        apparentPower: { sl1: +((Math.random() * 100).toFixed(2)), sl2: +((Math.random() * 100).toFixed(2)), sl3: +((Math.random() * 100).toFixed(2)) },
        cos: { cosl1: +((Math.random()).toFixed(2)), cosl2: +((Math.random()).toFixed(2)), cosl3: +((Math.random()).toFixed(2)) }
      };
      const doc = await Reading.create(fake);
      console.log('💾 Seeded fake reading:', doc);
    } catch (e) {
      console.error('❌ Seeder error:', e);
    }
  }, 1000);
}

// 5) ChangeStream → every insert pe front ko emit karo
function startChangeStream() {
  const stream = Reading.watch([{ $match: { operationType: 'insert' } }]);
  stream.on('change', ({ fullDocument }) => io.emit('new-reading', fullDocument));
  stream.on('error', err => {
    console.error('⚠️ ChangeStream error:', err);
    stream.close();
    setTimeout(startChangeStream, 5000);
  });
  return stream;
}
startChangeStream();

// 6) REST endpoints
app.get('/api/readings', async (req, res) => {
  const filter = {};
  if (req.query.start || req.query.end) filter.createdAt = {};
  if (req.query.start) filter.createdAt.$gte = new Date(req.query.start);
  if (req.query.end) filter.createdAt.$lte = new Date(req.query.end);
  try {
    const data = await Reading.find(filter).sort({ createdAt: 1 });
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/readings', async (req, res) => {
  try {
    const saved = await new Reading(req.body).save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Dynamic readings schema/model
const readingSchemaDynamic = new mongoose.Schema({
  gatewayId: String,
  timestamp: String,       // stored as ISO string
  data: mongoose.Schema.Types.Mixed,
});
const ReadingDynamic = mongoose.models.Readingdynamic || mongoose.model('Readingdynamic', readingSchemaDynamic);

// Enhanced endpoint for dynamic readings with raw ISO-string filtering
app.get('/api/readingsdynamic', async (req, res) => {
  try {
    console.log('req.query =', req.query);
    const { gatewayId, startDate, endDate } = req.query;
    const filter = {};

    if (gatewayId) filter.gatewayId = gatewayId;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = startDate;
      if (endDate)   filter.timestamp.$lte = endDate;
    }

    console.log('🔍 Final filter =', JSON.stringify(filter));

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

// 7) Start server
server.listen(port, () => {
  console.log(`🚀 Server + WebSocket listening on port ${port}`);
});
