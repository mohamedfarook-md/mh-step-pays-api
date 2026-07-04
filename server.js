const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
// app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
const allowedOrigins = [
  "http://localhost:5173",
  "https://mhsteppayshub.in",
  "http://mhsteppayshub.in"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/agents', require('./routes/agentRoutes'));
app.use('/api/merchants', require('./routes/merchantRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/qr', require('./routes/qrRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/audit', require('./routes/auditRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/commissions', require('./routes/commissionRoutes'));

// DB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));