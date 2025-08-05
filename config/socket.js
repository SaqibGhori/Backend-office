const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const ReadingDynamic = require('../src/models/ReadingDynamic');
const AlarmSetting = require('../src/models/AlarmSetting');
const AlarmRecord = require('../src/models/AlarmRecord');

module.exports = function initSocket(server, origin) {
  const io = new Server(server, {
    cors: { origin, methods: ['GET', 'POST'] },
    transports: ['websocket'],
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('subscribe', async ({ gatewayId, token }) => {
      // Leave all previous rooms except own socket room
      for (let r of socket.rooms) {
        if (r !== socket.id) socket.leave(r);
      }

      if (gatewayId) {
        socket.join(gatewayId);
        console.log(`${socket.id} subscribed to ${gatewayId}`);
      }

      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET); // Replace with your secret key
          const userId = decoded.userId; // Assuming payload has userId field

          if (userId) {
            socket.join(`user-${userId}`);
            console.log(`${socket.id} subscribed to user-${userId}`);

            // Optional: Emit recent alarms on subscribe
            const recentAlarms = await AlarmRecord.find({ userId })
              .sort({ timestamp: -1 })
              .limit(20);

            socket.emit('global-alarms', recentAlarms);
          }
        } catch (err) {
          console.error('JWT Verification Failed', err);
        }
      }
    });
  });

  function startStream() {
    const stream = ReadingDynamic.watch([{ $match: { operationType: 'insert' } }]);

    stream.on('change', async ({ fullDocument }) => {
      try {
        const { gatewayId, timestamp, data, userId } = fullDocument;

        // Broadcast reading to all clients
        io.emit('new-reading', fullDocument);

        // Load alarm settings
        const settings = await AlarmSetting.find({ gatewayId });
        const alarms = [];

        for (const [cat, subObj] of Object.entries(data || {})) {
          for (const [sub, val] of Object.entries(subObj || {})) {
            const cfg = settings.find(
              s => s.category === cat && s.subcategory === sub
            );
            if (!cfg) continue;

            const isHigh = cfg.high !== undefined && val > cfg.high;
            const isLow = cfg.low !== undefined && val < cfg.low;

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
          await AlarmRecord.insertMany(alarms);

          // 🔥 Emit to specific rooms
          io.to(gatewayId).emit('new-alarms', alarms);         // For device-based view
          io.to(`user-${userId}`).emit('global-alarms', alarms); // For user dashboard
        }

      } catch (err) {
        console.error('Stream processing error:', err);
      }
    });

    stream.on('error', err => {
      console.error('ChangeStream error:', err);
      stream.close();
      setTimeout(startStream, 5000); // Retry after 5 sec
    });
  }

  startStream();
  return io;
};
