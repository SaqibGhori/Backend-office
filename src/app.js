const express = require('express');
const cors = require('cors');
const alarmRecordRoutes = require("./routes/AlarmRecordRoutes");
const alarmSettingsRoutes = require("./routes/AlarmsSettingsRoutes");
const readingRoutes = require('./routes/readingRoutes');
const errorHandler = require('./utils/errorHandler');

const app = express();
const isDev = process.env.NODE_ENV !== 'production';

app.use(express.json());
app.use(cors({
  origin: isDev ? 'http://localhost:5173' : 'https://your-production-domain.com',
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE'],
}));

app.use("/api", alarmRecordRoutes);
app.use("/api", alarmSettingsRoutes); 
app.use('/api', readingRoutes);
app.use(errorHandler);

module.exports = app;
