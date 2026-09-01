// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const dotenv = require('dotenv');
// const soundboxRoutes = require("./routes/soundboxRoutes");
// dotenv.config();

// const app = express();

// // Middleware
// // app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
// const allowedOrigins = [
//   "http://localhost:5173",
//   "https://mhsteppayshub.in",
//   "http://mhsteppayshub.in"
// ];

// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS"));
//     }
//   },
//   credentials: true
// }));
// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// // Routes
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/agents', require('./routes/agentRoutes'));
// app.use('/api/merchants', require('./routes/merchantRoutes'));
// app.use('/api/admin', require('./routes/adminRoutes'));
// app.use('/api/qr', require('./routes/qrRoutes'));
// app.use('/api/notifications', require('./routes/notificationRoutes'));
// app.use('/api/attendance', require('./routes/attendanceRoutes'));
// app.use('/api/audit', require('./routes/auditRoutes'));
// app.use('/api/reports', require('./routes/reportRoutes'));
// app.use('/api/commissions', require('./routes/commissionRoutes'));
// app.use('/api/soundboxes', soundboxRoutes);
// app.use("/api/easebuzz", require("./routes/easebuzzWebhookRoutes"));
// const axios = require("axios");

// app.get("/api/test-easebuzz", async (req, res) => {
//   try {
//     const response = await axios.get(
//       "https://wire.easebuzz.in/api/v2/insta-collect/internal/transactions/",
//       {
//         params: {
//           current: 1,
//           pageSize: 10
//         },
//         headers: {
//           Cookie: process.env.EASEBUZZ_COOKIE
//         }
//       }
//     );

//     return res.json(response.data);

//   } catch (err) {
//     console.error(err.response?.data || err.message);

//     return res.status(500).json({
//       success: false,
//       error: err.response?.data || err.message
//     });
//   }
// });

// // DB Connection
// mongoose.connect(process.env.MONGODB_URI)
//   .then(() => console.log('MongoDB connected'))
//   .catch(err => console.error('MongoDB error:', err));

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));





// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const dotenv = require('dotenv');
// const path = require("path");
// const axios = require("axios");
// const soundboxRoutes = require("./routes/soundboxRoutes");
// const entityDocumentRoutes = require("./routes/entityDocumentRoutes");
// const payuRoutes = require("./routes/payuRoutes");

// dotenv.config({
//   path: path.join(__dirname, ".env")
// });

// console.log("PAYU_AUTH_BASE_URL =", process.env.PAYU_AUTH_BASE_URL);
// console.log("PAYU_BASE_URL =", process.env.PAYU_BASE_URL);
// console.log("PAYU_CLIENT_ID =", process.env.PAYU_CLIENT_ID ? "Loaded" : "Missing");

// const app = express();








const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const axios = require("axios");

// FIRST load .env
dotenv.config({
  path: path.join(__dirname, ".env")
});

// Debug (temporary)
console.log("PAYU_AUTH_BASE_URL =", process.env.PAYU_AUTH_BASE_URL);
console.log("PAYU_BASE_URL =", process.env.PAYU_BASE_URL);
console.log("PAYU_CLIENT_ID =", process.env.PAYU_CLIENT_ID ? "Loaded" : "Missing");

// AFTER dotenv, import routes
const soundboxRoutes = require("./routes/soundboxRoutes");
const entityDocumentRoutes = require("./routes/entityDocumentRoutes");
const payuRoutes = require("./routes/payuRoutes");

const app = express();






// Middleware
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
app.use('/api/soundboxes', soundboxRoutes);
app.use("/api/easebuzz", require("./routes/easebuzzWebhookRoutes"));
app.use("/api/payu", payuRoutes);
app.use("/api/entity-documents", entityDocumentRoutes);
/**
 * TEST ROUTE - Get Merchant Key
 */
app.get("/api/test-key", async (req, res) => {
  try {
    const response = await axios.get(
      "https://wire.easebuzz.in/api/v1/internal/authentications/merchant/key/",
      {
        headers: {
          Cookie: process.env.EASEBUZZ_COOKIE,
          Accept: "application/json"
        }
      }
    );

    return res.json(response.data);

  } catch (err) {
    console.error(err.response?.data || err.message);

    return res.status(500).json({
      success: false,
      error: err.response?.data || err.message
    });
  }
});

// DB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});