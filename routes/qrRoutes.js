// qrRoutes.js
const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { QRCode } = require('../models/index');
router.use(protect, adminOnly);
router.get('/', async (req, res) => {
  try {
    const qrs = await QRCode.find().populate('merchant', 'merchantName shopName').sort({ createdAt: -1 });
    res.json({ success: true, data: qrs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
module.exports = router;