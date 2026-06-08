const Merchant = require('../models/Merchant');
const MerchantDocument = require('../models/MerchantDocument');
const { QRCode, Commission } = require('../models/index');
const { createAuditLog } = require('../utils/auditLogger');
const { sendNotification, NOTIFICATION_TYPES } = require('../utils/notifications');
const { uploadMerchantDoc } = require('../config/cloudinary');
const Admin = require('../models/Admin');

// ─── Duplicate Check Helper ────────────────────────────────────────────────
const checkDuplicate = async (mobile, aadhaarNumber, panNumber, excludeId = null) => {
  const query = { $or: [{ mobile }] };
  if (aadhaarNumber) query.$or.push({ aadhaarNumber });
  if (panNumber) query.$or.push({ panNumber });
  if (excludeId) query._id = { $ne: excludeId };

  const existing = await Merchant.findOne(query);
  if (!existing) return null;

  if (existing.mobile === mobile) return 'Mobile number already registered';
  if (aadhaarNumber && existing.aadhaarNumber === aadhaarNumber) return 'Aadhaar number already registered';
  if (panNumber && existing.panNumber === panNumber) return 'PAN number already registered';
  return 'Duplicate merchant found';
};

// ─── Create Merchant (Draft) ───────────────────────────────────────────────
exports.createMerchant = async (req, res) => {
  try {
    const { merchantName, mobile, email, shopName, businessCategory, address, aadhaarNumber, panNumber } = req.body;

    const dupError = await checkDuplicate(mobile, aadhaarNumber, panNumber);
    if (dupError) return res.status(409).json({ success: false, message: dupError });

    const merchant = await Merchant.create({
      merchantName, mobile, email, shopName, businessCategory, address,
      aadhaarNumber, panNumber,
      assignedAgent: req.user._id,
      status: 'draft',
      statusTimeline: [{ status: 'draft', updatedBy: req.user._id, updatedByRole: 'agent', note: 'Merchant created' }],
    });

    await createAuditLog({ userId: req.user._id, userRole: 'agent', action: 'MERCHANT_SUBMISSION', entityType: 'Merchant', entityId: merchant._id, newValue: { merchantName, mobile }, req });

    res.status(201).json({ success: true, data: merchant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Submit Merchant ───────────────────────────────────────────────────────
exports.submitMerchant = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ _id: req.params.id, assignedAgent: req.user._id });
    if (!merchant) return res.status(404).json({ success: false, message: 'Merchant not found' });
    if (merchant.status !== 'draft') return res.status(400).json({ success: false, message: 'Only draft merchants can be submitted' });

    const docs = await MerchantDocument.findOne({ merchant: merchant._id });
    if (!docs) return res.status(400).json({ success: false, message: 'Please upload documents before submitting' });

    merchant.status = 'submitted';
    merchant.statusTimeline.push({ status: 'submitted', updatedBy: req.user._id, updatedByRole: 'agent' });
    await merchant.save();

    // Notify all admins
    const admins = await Admin.find({ isActive: true });
    for (const admin of admins) {
      await sendNotification({ recipient: admin._id, recipientRole: 'admin', type: NOTIFICATION_TYPES.NEW_MERCHANT_SUBMISSION, title: 'New Merchant Submitted', message: `${merchant.merchantName} submitted by Agent`, relatedEntity: merchant._id, relatedEntityType: 'Merchant' });
    }

    res.json({ success: true, data: merchant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get Agent's Merchants ─────────────────────────────────────────────────
exports.getMyMerchants = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const query = { assignedAgent: req.user._id };
    if (status) query.status = status;
    if (search) query.$or = [
      { merchantName: new RegExp(search, 'i') },
      { shopName: new RegExp(search, 'i') },
      { mobile: new RegExp(search, 'i') },
    ];

    const total = await Merchant.countDocuments(query);
    const merchants = await Merchant.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: merchants, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get Agent Dashboard Stats ─────────────────────────────────────────────
exports.getAgentStats = async (req, res) => {
  try {
    const agentId = req.user._id;
    const [total, pending, approved, active, rejected, commissionEligible] = await Promise.all([
      Merchant.countDocuments({ assignedAgent: agentId }),
      Merchant.countDocuments({ assignedAgent: agentId, status: { $in: ['submitted', 'under_review'] } }),
      Merchant.countDocuments({ assignedAgent: agentId, status: 'approved' }),
      Merchant.countDocuments({ assignedAgent: agentId, status: 'active' }),
      Merchant.countDocuments({ assignedAgent: agentId, status: 'rejected' }),
      Merchant.countDocuments({ assignedAgent: agentId, commissionEligible: true }),
    ]);
    res.json({ success: true, data: { total, pending, approved, active, rejected, commissionEligible } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get Single Merchant ───────────────────────────────────────────────────
exports.getMerchant = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.params.id)
      .populate('assignedAgent', 'fullName email mobile')
      .populate('qrCode');

    if (!merchant) return res.status(404).json({ success: false, message: 'Merchant not found' });

    // Agents can only see their own
    if (req.user.role === 'agent' && merchant.assignedAgent._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: merchant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Update Merchant (Draft only) ─────────────────────────────────────────
exports.updateMerchant = async (req, res) => {
  try {
    const { merchantName, mobile, email, shopName, businessCategory, address, aadhaarNumber, panNumber } = req.body;
    const merchant = await Merchant.findOne({ _id: req.params.id, assignedAgent: req.user._id, status: 'draft' });
    if (!merchant) return res.status(404).json({ success: false, message: 'Merchant not found or cannot be edited' });

    const dupError = await checkDuplicate(mobile, aadhaarNumber, panNumber, merchant._id);
    if (dupError) return res.status(409).json({ success: false, message: dupError });

    Object.assign(merchant, { merchantName, mobile, email, shopName, businessCategory, address, aadhaarNumber, panNumber });
    await merchant.save();

    await createAuditLog({ userId: req.user._id, userRole: 'agent', action: 'MERCHANT_UPDATES', entityType: 'Merchant', entityId: merchant._id, req });
    res.json({ success: true, data: merchant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};