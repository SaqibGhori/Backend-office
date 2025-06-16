// server.js
require('dotenv').config();         
const isDev = process.env.NODE_ENV !== 'production';
const express  = require('express');
const mongoose = require('mongoose');
const http     = require('http');
const { Server } = require('socket.io');

const app  = express();

app.use(express.json());
const port = process.env.PORT;

// 1) MongoDB connect
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('❌ Connection error:', err);
    process.exit(1);
  });

// 2) Define Reading model
const readingSchema = new mongoose.Schema({
  voltage:   Number,
  current:   Number,
  frequency: Number,
  createdAt: { type: Date, default: Date.now, index: true }
});
const Reading = mongoose.model('Reading', readingSchema);

// 3) Start HTTP + WebSocket server
const server = http.createServer(app);
const io     = new Server(server,{
  cors:{
    origin:"https://office-app-2g3w.vercel.app/",
    methods:["GET","POST"]
  }
});

io.on('connection', socket => {
  console.log('✅ New client connected:', socket.id);
});

// 4) Seeder: har second ek random reading DB mein insert karo
setInterval(async () => {
  try {
    const fake = new Reading({
      voltage:   +(Math.random() * 100).toFixed(2),
      current:   +(Math.random() * 50).toFixed(2),
      frequency: +(50 + Math.random() * 10).toFixed(2)
    });
    await fake.save();
    console.log('💾 Seeded fake reading:', fake);
  } catch (e) {
    console.error('❌ Seeder error:', e);
  }
}, 1000);
// if (isDev) {
//   setInterval(async () => {
//     try {
//       const fake = new Reading({
//         voltage:   +(Math.random() * 100).toFixed(2),
//         current:   +(Math.random() * 50).toFixed(2),
//         frequency: +(50 + Math.random() * 10).toFixed(2)
//       });
//       await fake.save();
//       console.log('💾 Seeded fake reading:', fake);
//     } catch (e) {
//       console.error('❌ Seeder error:', e);
//     }
//   }, 1000);
// }
// 5) ChangeStream with auto-restart
function startChangeStream() {
  const stream = Reading.watch([{ $match: { operationType: 'insert' } }]);

  stream.on('change', ({ fullDocument }) => {
    // emit every new insert to all clients
    io.emit('new-reading', fullDocument);
  });

  stream.on('error', err => {
    console.error('⚠️ ChangeStream error:', err);
    stream.close();
    setTimeout(startChangeStream, 5000); // 5s baad dobara chalu karo
  });

  return stream;
}
startChangeStream();

// 6) REST endpoint for historical fetch or manual POST
app.post('/api/readings', async (req, res) => {
  try {
    const saved = await new Reading(req.body).save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/readings', async (req, res) => {
  const { start, end } = req.query;
  const filter = {};
  if (start || end) filter.createdAt = {};
  if (start) filter.createdAt.$gte = new Date(start);
  if (end)   filter.createdAt.$lte = new Date(end);

  try {
    const data = await Reading.find(filter).sort({ createdAt: 1 });
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 7) Launch serversss
server.listen(port, () => {
  console.log(`🚀 Server + WebSocket listening on http://localhost:${port}`);
});
