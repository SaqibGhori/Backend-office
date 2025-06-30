const { Server } = require('socket.io');
const Reading = require('../src/models/Reading');

module.exports = function initSocket(server, origin) {
  const io = new Server(server, {
    cors: { origin, methods: ['GET','POST'] }
  });

  io.on('connection', socket => {
    console.log(`🆔 Client connected: ${socket.id}`);

    // Room subscription
    socket.on('subscribe', gatewayId => {
      Array.from(socket.rooms)
        .filter(r => r.startsWith('gateway-'))
        .forEach(r => socket.leave(r));
      socket.join(gatewayId);
      console.log(`🔔 ${socket.id} subscribed to ${gatewayId}`);
    });

    // Historical data fetch
    socket.on('get-history', async ({ gatewayId, startDate, endDate }) => {
      try {
        const filter = {};
        if (gatewayId) filter.gatewayId = gatewayId;
        if (startDate || endDate) filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate)   filter.timestamp.$lte = new Date(endDate);

        const data = await Reading.find(filter)
          .sort({ timestamp: 1 })
          .lean();

        socket.emit('history', data);
      } catch (err) {
        console.error('❌ History fetch error:', err);
        socket.emit('error', 'History fetch failed');
      }
    });

    socket.on('disconnect', () =>
      console.log(`❌ Client disconnected: ${socket.id}`)
    );
  });

  // ChangeStream for realtime inserts
  const stream = Reading.watch([{ $match: { operationType: 'insert' } }]);
  stream.on('change', ({ fullDocument }) => {
    io.to(fullDocument.gatewayId).emit('new-reading', fullDocument);
  });
  stream.on('error', err => {
    console.error('⚠️ ChangeStream error:', err);
    stream.close();
    setTimeout(() => initSocket(server, origin), 5000);
  });
};
