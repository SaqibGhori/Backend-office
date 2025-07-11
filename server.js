require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./config/db');
const initSocket = require('./config/socket');

const port = process.env.PORT||3000;
const server = http.createServer(app);

connectDB(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .then(() => {
    if (process.env.NODE_ENV!=='production') {
      require('./seeders/dynamicSeeder');
    }
    initSocket(server, process.env.CORS_ORIGIN||'*');
    server.listen(port, ()=>console.log(`🚀 Server listening on ${port}`));
  })
  .catch(err=>{
    console.error('❌ DB error:', err);
    process.exit(1);
  });