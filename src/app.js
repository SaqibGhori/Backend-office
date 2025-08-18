// app.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const ingestRoutes        = require('./routes/ingestRoutes');
const authRoutes          = require('./routes/authRoutes');
const readingRoutes       = require('./routes/readingRoutes');
const alarmSettingsRoutes = require('./routes/AlarmsSettingsRoutes');
const alarmRecordRoutes   = require('./routes/AlarmRecordRoutes');
const gatewayRoutes       = require('./routes/gatewayRoutes');
const superadminAuth      = require('./routes/superadminAuth');

const { authMiddleware, checkRole } = require('./middleware/auth');
const errorHandler        = require('./utils/errorHandler');
const passport            = require('./auth/google');

const app  = express();
const isDev = process.env.NODE_ENV !== 'production';

/* -------------------------- PUBLIC HEALTH ENDPOINTS ------------------------- */
/* Put these BEFORE any routers/middleware so they stay open (no auth) */
app.get('/health', (_req, res) =>
  res.json({ ok: true, message: 'WattMatrix API is running' })
);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

/* ------------------------------ CORE MIDDLEWARE ----------------------------- */
app.set('trust proxy', 1); // needed behind Render/HTTPS proxy
app.use(express.json());

// Build allowed origins from env; fall back to sensible defaults.
const corsFromEnv = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowedOrigins = corsFromEnv.length
  ? corsFromEnv
  : (isDev
      ? ['http://localhost:5173']
      : ['https://wattmatrix.io', 'https://www.wattmatrix.io']);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
);

// Passport (Google OAuth) – safe to init even if keys missing (see google.js guard)
app.use(passport.initialize());

/* ------------------------------- PUBLIC ROUTES ------------------------------ */
// Devices ingestion (public)
app.use('/api/ingest', ingestRoutes);

// Auth (login/register, OAuth)
app.use('/api/auth', authRoutes);

// Gateway listing/info (public unless your router protects inside)
app.use('/api/gateway', gatewayRoutes);

// Public reads (adjust inside router if some endpoints need auth)
app.use('/api', readingRoutes);

// Alarm settings (mounts as written; protect inside router if required)
app.use('/api/alarm-settings', alarmSettingsRoutes);

// Alarm records (same note as above)
app.use('/api', alarmRecordRoutes);

/* ------------------------------ ERROR HANDLER ------------------------------- */
app.use(errorHandler);

module.exports = app;
