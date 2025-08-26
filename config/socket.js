const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const ReadingDynamic = require('../src/models/ReadingDynamic');
const AlarmSetting   = require('../src/models/AlarmSetting');
const AlarmRecord    = require('../src/models/AlarmRecord');

module.exports = function initSocket(server, origin) {
  const io = new Server(server, {
    cors: { origin, methods: ['GET', 'POST'] },
    transports: ['websocket'],        // low-latency
    perMessageDeflate: false,         // CPU save, lower lag
    path: '/socket.io',
    pingInterval: 10000,
    pingTimeout: 25000,
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // track current rooms (so user room persist rahe)
    let currentGatewayRoom = null;
    let currentUserRoom = null;

    socket.on('subscribe', async ({ gatewayId, token }) => {
      try {
        // decode userId (optional)
        let userId = undefined;
        if (token) {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.userId || decoded.id;
          } catch (err) {
            console.error('JWT Verification Failed', err.message);
          }
        }

        // leave previous gateway room ONLY (user room ko mat chhorro)
        if (currentGatewayRoom && currentGatewayRoom !== gatewayId) {
          socket.leave(currentGatewayRoom);
          console.log(`${socket.id} left ${currentGatewayRoom}`);
          currentGatewayRoom = null;
        }

        // join new gateway room
        if (gatewayId && currentGatewayRoom !== gatewayId) {
          socket.join(gatewayId);
          currentGatewayRoom = gatewayId;
          console.log(`${socket.id} subscribed to ${gatewayId}`);
        }

        // (re)join user room if we have one
        if (userId) {
          const userRoom = `user-${userId}`;
          if (currentUserRoom !== userRoom) {
            if (currentUserRoom) socket.leave(currentUserRoom);
            socket.join(userRoom);
            currentUserRoom = userRoom;
            console.log(`${socket.id} subscribed to ${userRoom}`);

            // Optional: Emit recent alarms to this socket only
            const recentAlarms = await AlarmRecord.find({ userId })
              .sort({ timestamp: -1 })
              .limit(20)
              .lean();
            socket.emit('global-alarms', recentAlarms);
          }
        }

        // ⚡ Instant UX: last reading snapshot for this gateway
        if (gatewayId) {
          const last = await ReadingDynamic
            .findOne({ gatewayId })
            .sort({ timestamp: -1 })
            .lean();
          if (last) socket.emit('reading', last); // 👈 event name `reading` (standardize)
        }

        // ack
        socket.emit('subscribed', { ok: true, gatewayId, userRoom: currentUserRoom });
      } catch (e) {
        console.error('subscribe error:', e);
        socket.emit('subscribed', { ok: false, error: e.message });
      }
    });

    socket.on('disconnect', () => {
      // no-op (rooms auto cleaned)
    });
  });

  // 🔴 DB -> Socket bridge
  function startStream() {
    // fullDocument ensure karo
    const stream = ReadingDynamic.watch(
      [{ $match: { operationType: 'insert' } }],
      { fullDocument: 'updateLookup' }
    );

    stream.on('change', async ({ fullDocument }) => {
      try {
        if (!fullDocument) return;
        const { gatewayId, timestamp, data, userId } = fullDocument;

        // ✅ Room-scoped low-latency emit + consistent event name
        if (gatewayId) io.to(gatewayId).emit('reading', fullDocument);
        if (userId)    io.to(`user-${userId}`).emit('reading', fullDocument);

        // --- Alarm logic as-is (but roomed) ---
        const settings = await AlarmSetting.find({ gatewayId }).lean();
        if (settings && settings.length) {
          const alarms = [];
          for (const [cat, subObj] of Object.entries(data || {})) {
            for (const [sub, val] of Object.entries(subObj || {})) {
              const cfg = settings.find(s => s.category === cat && s.subcategory === sub);
              if (!cfg) continue;
              const isHigh = cfg.high !== undefined && val > cfg.high;
              const isLow  = cfg.low  !== undefined && val < cfg.low;
              if (isHigh || isLow) {
                alarms.push({
                  gatewayId,
                  userId,
                  timestamp,
                  category: cat,
                  subcategory: sub,
                  value: val,
                  priority: cfg.priority,
                });
              }
            }
          }
          if (alarms.length) {
            await AlarmRecord.insertMany(alarms, { ordered: false });
            if (gatewayId) io.to(gatewayId).emit('new-alarms', alarms);
            if (userId)    io.to(`user-${userId}`).emit('global-alarms', alarms);
          }
        }
      } catch (err) {
        console.error('Stream processing error:', err);
      }
    });

    stream.on('error', err => {
      console.error('ChangeStream error:', err);
      try { stream.close(); } catch {}
      setTimeout(startStream, 5000); // Retry after 5 sec
    });
  }

  startStream();
  return io;
};
