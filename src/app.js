require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const ingestRoutes = require('./routes/ingestRoutes');
const authRoutes = require('./routes/authRoutes');
const readingRoutes = require('./routes/readingRoutes');
const alarmSettingsRoutes = require('./routes/AlarmsSettingsRoutes');
const alarmRecordRoutes = require('./routes/AlarmRecordRoutes');
const gatewayRoutes = require('./routes/gatewayRoutes');
const purchasesRoute = require('./routes/Purchase');
const superadminAuth = require('./routes/superadminAuth')
const adminUsersRoute = require('./routes/AdminUsers');
const meRoute = require('./routes/me');

const { authMiddleware,
  checkRole } = require('./middleware/auth');
const errorHandler = require('./utils/errorHandler');
const app = express();
const isDev = process.env.NODE_ENV !== 'production';
const passport = require('./auth/google');

// trust proxy (prod behind nginx etc.)
app.set('trust proxy', 1);

// CORS (dev me FE alag port pe ho to bhi safe)
app.use(cors({ origin: true, credentials: true }));

// ✅ Serve uploads from /uploads (src/uploads/*)
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res) => {
      // cache ok for images; dev me farq nahi padega
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
    },
  })
);
// Body parser & CORS
app.use(express.json());
app.use(cors({
  origin: isDev
    ? 'http://localhost:5173'
    : 'https://wattmatrix.io',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));


app.use(
  '/superadmin/auth',
  superadminAuth
);

app.use('/api/admin', adminUsersRoute);

app.use(passport.initialize());

// serve uploaded images
// app.use('/uploads', express.static(path.join(__dirname, 'src', 'uploads')));

// route
app.use('/api/purchases', purchasesRoute);
app.use('/api', meRoute);


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
  '/api', alarmRecordRoutes
);

// 6️⃣ Error handler (always last)
app.use(errorHandler);

module.exports = app;
