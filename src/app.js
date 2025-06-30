require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./utils/errorHandler');
const readingsRoute = require('./routes/readings');

const app = express();
const isDev = process.env.NODE_ENV !== 'production';

app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || (isDev ? 'http://localhost:5173' : ''),
  credentials: true,
}));

app.use('/api', readingsRoute);
app.use(errorHandler);

module.exports = app;
