require('dotenv').config();
const express               = require('express');
const cors                  = require('cors');
const ingestRoutes          = require('./routes/ingestRoutes');
const authRoutes            = require('./routes/authRoutes');
const readingRoutes         = require('./routes/readingRoutes');
const alarmSettingsRoutes   = require('./routes/AlarmsSettingsRoutes');
const alarmRecordRoutes     = require('./routes/AlarmRecordRoutes');
const gatewayRoutes     = require('./routes/gatewayRoutes');
const superadminAuth = require('./routes/superadminAuth')
const { authMiddleware,
        checkRole }         = require('./middleware/auth');
const errorHandler          = require('./utils/errorHandler');
const superadminAuth = require('./routes/superadminAuth')
const app = express();
const isDev = process.env.NODE_ENV  !== 'production';
const passport = require('./auth/google');


// Body parser & CORS
app.use(express.json());  
app.use(cors({
  origin: isDev
    ? 'http://localhost:5173'
    : 'https://your-production-domain.com',
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE'],
}));


app.use(
  '/superadmin/auth',
  superadminAuth
);

app.use(passport.initialize());

// 1️⃣ Public ingestion—devices always allowed
app.use('/api/ingest', ingestRoutes);

// 2️⃣ Public auth—register & login
app.use('/api/auth', authRoutes);

app.use('/api/gateway', gatewayRoutes);



// 3️⃣ Public data reads—gateways & readings (no JWT required)
app.use('/api', readingRoutes);

app.use(
  '/api/alarm-settings',
  alarmSettingsRoutes
);

app.use(
  '/api',alarmRecordRoutes
);

// 6️⃣ Error handler (always last)
app.use(errorHandler);

module.exports = app;
