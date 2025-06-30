// server.js

require('dotenv').config();
const http = require('http');
const connectDB = require('./config/db');
const initSocket = require('./config/socket');
const app = require('./src/app');

const port = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

connectDB(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ DB connection error:', err);
    process.exit(1);
  });

// **Seeder ko yahan import karo development mode mein**
if (isDev) {
  console.log('🔧 Running dynamic seeder...');
  require('./src/seeders/dynamicSeeder');
}

const server = http.createServer(app);
initSocket(server, process.env.CORS_ORIGIN || '*');

server.listen(port, () =>
  console.log(`🚀 Server listening on port ${port}`)
);
