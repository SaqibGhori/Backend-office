const { Server } = require('socket.io');
const ReadingDynamic = require('../src/models/ReadingDynamic');
const AlarmSetting   = require('../src/models/AlarmSetting');
const AlarmRecord    = require('../src/models/AlarmRecord');

module.exports = function initSocket(server, origin) {
  // 1️⃣ Initialize Socket.IO
  const io = new Server(server, {
    cors: { origin, methods: ['GET', 'POST'] },
    transports: ['websocket'],
    path: '/socket.io',
  });

  io.on('connection', socket => {
    console.log('New client connected:', socket.id);

    socket.on('subscribe', gatewayId => {
      // leave any previous gateway rooms, then join the new one
      Array.from(socket.rooms)
        .filter(r => r.startsWith('gateway-'))
        .forEach(r => socket.leave(r));
      socket.join(gatewayId);
      console.log(`${socket.id} subscribed to ${gatewayId}`);
    });
  });

  function startStream() {
    const stream = ReadingDynamic.watch([{ $match: { operationType: 'insert' } }]);

    stream.on('change', async ({ fullDocument }) => {
      try {
        // 1. Broadcast new reading to all
        io.emit('new-reading', fullDocument);

        // 2. Alarm detection logic
        const reading = fullDocument;
        const { gatewayId, timestamp, data } = reading;
        const settings = await AlarmSetting.find({ gatewayId });
        const alarms = [];

        for (const [cat, subObj] of Object.entries(fullDocument.data || {})) {
          for (const [sub, val] of Object.entries(subObj || {})) {
            const cfg = settings.find(s => s.category === cat && s.subcategory === sub);
            if (!cfg) continue;
            if (
              (cfg.high !== undefined && val > cfg.high) ||
              (cfg.low  !== undefined && val < cfg.low)
            ) {
              alarms.push({
                gatewayId,
                timestamp: fullDocument.timestamp,
                category: cat,
                subcategory: sub,
                value: val,
                priority: cfg.priority,
              });
            }
          }
        }

        if (alarms.length > 0) {
          await AlarmRecord.insertMany(alarms);
          io.to(gatewayId).emit('new-alarms', alarms);

          alarms.forEach(alarm => {
            io.emit('global-alarms', alarm);
          });
        }     
      } catch (err) {
        console.error('Stream processing error:', err);
      }
    });

    stream.on('error', err => {
      console.error('ChangeStream error:', err);
      stream.close();
      setTimeout(startStream, 5000);
    });
  }

  startStream();

  // 3️⃣ Return io so server.js can expose it to Express
  return io;
};
