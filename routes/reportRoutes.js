// reportRoutes.js
const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const Merchant = require('../models/Merchant');
const FieldAgent = require('../models/FieldAgent');

router.use(protect, adminOnly);

router.get('/merchant-acquisition', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};
    if (startDate || endDate) query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
    const merchants = await Merchant.find(query).populate('assignedAgent', 'fullName');
    res.json({ success: true, data: merchants });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/agent-performance', async (req, res) => {
  try {
    const agents = await FieldAgent.find({ status: 'approved' }).select('-password');
    const perf = await Promise.all(agents.map(async a => {
      const [submitted, approved, active, eligible] = await Promise.all([
        Merchant.countDocuments({ assignedAgent: a._id }),
        Merchant.countDocuments({ assignedAgent: a._id, status: { $in: ['approved', 'qr_uploaded', 'qr_deployed', 'active', 'commission_eligible'] } }),
        Merchant.countDocuments({ assignedAgent: a._id, status: 'active' }),
        Merchant.countDocuments({ assignedAgent: a._id, commissionEligible: true }),
      ]);
      return { agent: a, submitted, approved, active, eligible };
    }));
    res.json({ success: true, data: perf });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;