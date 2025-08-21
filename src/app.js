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

const app   = express();
const isDev = process.env.NODE_ENV !== 'production';

/* -------------------------------------------------------------------------- */
/* Health endpoints (public)                                                  */
/* -------------------------------------------------------------------------- */
app.get('/health', (_req, res) => res.json({ ok: true, message: 'WattMatrix API is running' }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

/* -------------------------------------------------------------------------- */
/* Core middleware                                                            */
/* -------------------------------------------------------------------------- */
app.set('trust proxy', 1);           // required behind Render/HTTPS proxies
app.use(express.json());             // JSON parsing

// ----- Build allowed origins from env (supports wildcards) ------------------
const fromEnv = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const defaultProd = ['https://wattmatrix.io', 'https://www.wattmatrix.io'];
const defaultDev  = ['http://localhost:5173'];

const allowList = fromEnv.length ? fromEnv : (isDev ? defaultDev : defaultProd);

// wildcard matcher: supports patterns like https://*.vercel.app
const matches = (origin, pattern) => {
  if (pattern.includes('*')) {
    const re = new RegExp('^' + pattern
      .replace(/\./g, '\\.')
      .replace('*', '.*') + '$');
    return re.test(origin);
  }
  return origin === pattern;
};

// one reusable cors options object (used for normal + preflight)
const corsOptions = {
  origin(origin, cb) {
    // allow same-origin/server-to-server/no-origin requests
    if (!origin) return cb(null, true);
    const ok = allowList.some(p => matches(origin, p));
    return ok ? cb(null, true) : cb(new Error('Not allowed by CORS'));
  },
  credentials: true,  // keep true if you use cookies/sessions; false if you don't
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
// handle CORS preflights explicitly
app.options('*', cors(corsOptions));

// Google OAuth (safe to init even if keys missing; your google.js should guard)
app.use(passport.initialize());

/* -------------------------------------------------------------------------- */
/* Public routes                                                              */
/* -------------------------------------------------------------------------- */
app.use('/api/ingest', ingestRoutes);         // device ingestion (public)
app.use('/api/auth', authRoutes);             // auth (login/register/OAuth)
app.use('/api/gateway', gatewayRoutes);       // gateway info (public)
app.use('/api', readingRoutes);               // public reads (adjust inside)
app.use('/api/alarm-settings', alarmSettingsRoutes);
app.use('/api', alarmRecordRoutes);

/* -------------------------------------------------------------------------- */
/* Error handler (last)                                                       */
/* -------------------------------------------------------------------------- */
app.use(errorHandler);

module.exports = app;
