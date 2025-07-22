const express = require('express');
const cors = require('cors');
const readingRoutes = require('./routes/readingRoutes');
const errorHandler = require('./utils/errorHandler');
const alarmRoutes = require("./routes/AlarmRoutes");
const alarmRecordRoutes = require("./routes/AlarmRecordRoutes");
const app = express();
const isDev = process.env.NODE_ENV !== 'production';

const alarmSettingsRoutes = require("./routes/AlarmsSettingsRoutes");
const gatewayRoutes = require('./routes/gatewayRoutes');

app.use(express.json());
app.use(cors({
  origin: isDev ? 'http://localhost:5173' : 'https://your-production-domain.com',
  credentials: true,
  // methods: ['GET','POST','PUT','DELETE'],
  methods: ['GET','POST','PUT','PATCH','DELETE'],   // ← PATCH add karo

}));

app.use("/api", alarmRecordRoutes);
app.use("/api", alarmRoutes);
app.use('/api', readingRoutes);
app.use("/api", alarmSettingsRoutes); 
app.use(errorHandler);
app.use("/api/gateways-meta", gatewayRoutes);

module.exports = app;
