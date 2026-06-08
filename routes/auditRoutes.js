// auditRoutes.js
const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { AuditLog } = require('../models/index');
router.use(protect, adminOnly);
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, entityType, action } = req.query;
    const query = {};
    if (entityType) query.entityType = entityType;
    if (action) query.action = new RegExp(action, 'i');
    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query).sort({ timestamp: -1 }).skip((page-1)*limit).limit(Number(limit));
    res.json({ success: true, data: logs, pagination: { total, page: Number(page), pages: Math.ceil(total/limit) } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
module.exports = router;