// attendanceRoutes.js
const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { AttendanceLog } = require('../models/index');

router.use(protect);
router.get('/my', async (req, res) => {
  try {
    const logs = await AttendanceLog.find({ agent: req.user._id }).sort({ loginTime: -1 }).limit(30);
    res.json({ success: true, data: logs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.get('/agent/:id', adminOnly, async (req, res) => {
  try {
    const logs = await AttendanceLog.find({ agent: req.params.id }).sort({ loginTime: -1 }).limit(30);
    res.json({ success: true, data: logs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;