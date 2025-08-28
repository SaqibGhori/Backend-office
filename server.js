
require('dotenv').config();
const http       = require('http');
const app        = require('./src/app');         // your fully-configured Express app
 const initSocket = require('./config/socket');
 const connectDB  = require('./config/db');



const port = process.env.PORT || 3000;
const server = http.createServer(app);
 
connectDB(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
//  if (process.env.ENABLE_SEEDER === 'true') {
//    require('./seeders/dynamicSeeder');
//  }
    if (process.env.NODE_ENV !== 'production') {
      require('./seeders/dynamicSeeder');
    }

    // Socket.IO init
    const io = initSocket(server, process.env.CORS_ORIGIN || '*');
    app.set('io', io);

    server.listen(port, () =>
      console.log(`🚀 Server listening on port ${port}`)
    );
  })
  .catch(err => {
    console.error('❌ DB connection error:', err);
    process.exit(1);
  });
