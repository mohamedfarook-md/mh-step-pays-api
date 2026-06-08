// commissionRoutes.js
const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { Commission } = require('../models/index');

router.use(protect);
router.get('/my', async (req, res) => {
  try {
    const commissions = await Commission.find({ agent: req.user._id }).populate('merchant', 'merchantName shopName').sort({ createdAt: -1 });
    res.json({ success: true, data: commissions });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.get('/', adminOnly, async (req, res) => {
  try {
    const commissions = await Commission.find().populate('agent', 'fullName').populate('merchant', 'merchantName').sort({ createdAt: -1 });
    res.json({ success: true, data: commissions });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;