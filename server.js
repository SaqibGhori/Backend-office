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
  voltageLN: {
    v1: Number, v2: Number, v3: Number
  },
  voltageLL: {
    v12: Number, v23: Number, v31: Number
  },
  current: {
    i1: Number, i2: Number, i3: Number
  },
  frequency: {
    f1: Number, f2: Number, f3: Number
  },
  activePower: {
    pl1: Number, pl2: Number, pl3: Number
  },
  reactivePower: {
    ql1: Number, ql2: Number, ql3: Number
  },
  apparentPower: {
    sl1: Number, sl2: Number, sl3: Number
  },
  cos: {
    cosl1: Number, cosl2: Number, cosl3: Number
  },
  createdAt: { type: Date, default: Date.now, index: true }
});

const Reading = mongoose.model('Reading', readingSchema);

// 3) Start HTTP + WebSocket server
const server = http.createServer(app);
const io     = new Server(server,{
  cors:{
    origin:"https://office-app-2g3w.vercel.app",
    methods:["GET","POST"]
  }
});

io.on('connection', socket => {
  console.log('✅ New client connected:', socket.id);
});

// 4) Seeder: har second ek random reading DB mein insert karo
// setInterval(async () => {
//   try {
//     const fake = new Reading({
//       voltage:   +(Math.random() * 100).toFixed(2),
//       current:   +(Math.random() * 50).toFixed(2),
//       frequency: +(50 + Math.random() * 10).toFixed(2)
//     });
//     await fake.save();
//     console.log('💾 Seeded fake reading:', fake);
//   } catch (e) {
//     console.error('❌ Seeder error:', e);
//   }
// }, 1000);

if (isDev) {
  setInterval(async () => {
    try {
      await Reading.create({
        voltageLN: { v1: +(Math.random() * 100).toFixed(2), v2: +(Math.random() * 100).toFixed(2), v3: +(Math.random() * 100).toFixed(2),},
        voltageLL: {
          v12: +(Math.random() * 120).toFixed(2),
          v23: +(Math.random() * 120).toFixed(2),
          v31: +(Math.random() * 120).toFixed(2),
        },
        current: {
          i1: +(Math.random() * 50).toFixed(2),
          i2: +(Math.random() * 50).toFixed(2),
          i3: +(Math.random() * 50).toFixed(2),
        },
        frequency: {
          f1: +(50 + Math.random() * 10).toFixed(2),
          f2: +(50 + Math.random() * 10).toFixed(2),
          f3: +(50 + Math.random() * 10).toFixed(2),
        },
        activePower: {
          PL1: +(Math.random() * 100).toFixed(2),
          PL2: +(Math.random() * 100).toFixed(2),
          PL3: +(Math.random() * 100).toFixed(2),
        },
        reactivePower: {
          QL1: +(Math.random() * 100).toFixed(2),
          QL2: +(Math.random() * 100).toFixed(2),
          QL3: +(Math.random() * 100).toFixed(2),
        },
        apparentPower: {
          SL1: +(Math.random() * 100).toFixed(2),
          SL2: +(Math.random() * 100).toFixed(2),
          SL3: +(Math.random() * 100).toFixed(2),
        },
        cos: {
          CosL1: +(Math.random() * 1).toFixed(2),   // Cos values between 0.00–1.00
          CosL2: +(Math.random() * 1).toFixed(2),
          CosL3: +(Math.random() * 1).toFixed(2),
        },
      });
    } catch (e) {
      console.error('❌ Seeder error:', e);
    }
  }, 1000);
}


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
