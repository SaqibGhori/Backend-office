const { Server } = require('socket.io');
const ReadingDynamic = require('../src/models/ReadingDynamic');

module.exports = function initSocket(server, origin) {
  const io = new Server(server, {
    cors: { origin, methods: ['GET','POST'] },
    transports: ['websocket'],   // ← disable polling
    path: '/socket.io',
  })

  io.on('connection', socket => {
    console.log('✅ New client connected:', socket.id);

    socket.on('subscribe', gatewayId => {
      Array.from(socket.rooms)
        .filter(r => r.startsWith('gateway-'))
        .forEach(r => socket.leave(r));
      socket.join(gatewayId);
      console.log(`🔔 ${socket.id} subscribed to ${gatewayId}`);
    });
  });

  function startStream() {
    const stream = ReadingDynamic.watch([{ $match:{ operationType:'insert' }}]);
    stream.on('change', ({ fullDocument }) => {
      io.emit('new-reading', fullDocument);
    });
    stream.on('error', err => {
      console.error('⚠️ ChangeStream error:', err);
      stream.close();
      setTimeout(startStream, 5000);
    });
  }
  startStream();
};
