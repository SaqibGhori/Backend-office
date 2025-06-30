require('dotenv').config();
const http = require('http');
const connectDB = require('./config/db');
const initSocket = require('./config/socket');
const app = require('./src/app');

const port = process.env.PORT || 3000;

connectDB(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ DB connection error:', err);
    process.exit(1);
  });

const server = http.createServer(app);
initSocket(server, process.env.CORS_ORIGIN || '*');

server.listen(port, () => console.log(`🚀 Server listening on port ${port}`));
