// // agentRoutes.js
// const express = require('express');
// const router = express.Router();
// const { protect, adminOnly } = require('../middleware/auth');
// const FieldAgent = require('../models/FieldAgent');

// router.use(protect);
// router.get('/profile', async (req, res) => {
//   res.json({ success: true, data: req.user });
// });
// router.put('/profile', async (req, res) => {
//   try {
//     const { fullName, mobile } = req.body;
//     const agent = await FieldAgent.findByIdAndUpdate(req.user._id, { fullName, mobile }, { new: true }).select('-password');
//     res.json({ success: true, data: agent });
//   } catch (err) { res.status(500).json({ success: false, message: err.message }); }
// });

// router.get(
//     "/invoices",
//     protectAgent,
//     agentController.getMyInvoices
// );

// module.exports = router;











const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const FieldAgent = require('../models/FieldAgent');
const merchantController = require('../controllers/merchantController');

router.use(protect);

router.get('/profile', async (req, res) => {
  res.json({ success: true, data: req.user });
});

router.put('/profile', async (req, res) => {
  try {
    const { fullName, mobile } = req.body;

    const agent = await FieldAgent.findByIdAndUpdate(
      req.user._id,
      { fullName, mobile },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      data: agent
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
});

router.get("/invoices", merchantController.getMyInvoices);

module.exports = router;