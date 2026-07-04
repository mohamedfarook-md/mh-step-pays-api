const FieldAgent = require('../models/FieldAgent');
const Merchant = require('../models/Merchant');
const MerchantDocument = require('../models/MerchantDocument');
const { QRCode, Commission, AuditLog, AttendanceLog, Invoice } = require('../models/index');
const { createAuditLog } = require('../utils/auditLogger');
const { sendNotification, NOTIFICATION_TYPES } = require('../utils/notifications');
const { getSignedUrl, uploadQR } = require('../config/cloudinary');

// ─── Dashboard Stats ───────────────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalAgents, activeAgents, pendingAgents,
      totalMerchants, pendingMerchants, approvedMerchants,
      activeMerchants, qrUploadedMerchants, commissionEligible
    ] = await Promise.all([
      FieldAgent.countDocuments(),
      FieldAgent.countDocuments({ status: 'approved' }),
      FieldAgent.countDocuments({ status: 'pending' }),
      Merchant.countDocuments(),
      Merchant.countDocuments({ status: { $in: ['submitted', 'under_review'] } }),
      Merchant.countDocuments({ status: 'approved' }),
      Merchant.countDocuments({ status: 'active' }),
      Merchant.countDocuments({ status: 'qr_uploaded' }),
      Merchant.countDocuments({ commissionEligible: true }),
    ]);

    // Growth data - last 6 months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString('default', { month: 'short' }) });
    }

    res.json({
      success: true, data: {
        totalAgents, activeAgents, pendingAgents,
        totalMerchants, pendingMerchants, approvedMerchants,
        activeMerchants, qrUploadedMerchants, commissionEligible,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Manage Agents ─────────────────────────────────────────────────────────
exports.getAgents = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) query.$or = [
      { fullName: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { mobile: new RegExp(search, 'i') },
    ];

    const total = await FieldAgent.countDocuments(query);
    const agents = await FieldAgent.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Add stats per agent
    const agentsWithStats = await Promise.all(agents.map(async (agent) => {
      const [submitted, approved, active, eligible] = await Promise.all([
        Merchant.countDocuments({ assignedAgent: agent._id }),
        Merchant.countDocuments({ assignedAgent: agent._id, status: 'approved' }),
        Merchant.countDocuments({ assignedAgent: agent._id, status: 'active' }),
        Merchant.countDocuments({ assignedAgent: agent._id, commissionEligible: true }),
      ]);
      return { ...agent.toObject(), stats: { submitted, approved, active, eligible } };
    }));

    res.json({ success: true, data: agentsWithStats, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateAgentStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const agent = await FieldAgent.findById(req.params.id);
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });

    const prevStatus = agent.status;
    agent.status = status;
    if (status === 'rejected') agent.rejectionReason = reason;
    if (status === 'suspended') agent.suspensionReason = reason;
    if (status === 'approved') { agent.approvedAt = new Date(); agent.approvedBy = req.user._id; }
    await agent.save();

    const actionMap = { approved: 'AGENT_APPROVAL', rejected: 'AGENT_REJECTION', suspended: 'AGENT_SUSPENSION' };
    await createAuditLog({ userId: req.user._id, userRole: 'admin', action: actionMap[status] || 'STATUS_CHANGE', entityType: 'FieldAgent', entityId: agent._id, previousValue: { status: prevStatus }, newValue: { status }, req });

    const notifMap = {
      approved: { type: NOTIFICATION_TYPES.AGENT_APPROVED, title: 'Account Approved', message: 'Your Field Agent account has been approved. You can now log in.' },
      rejected: { type: NOTIFICATION_TYPES.AGENT_REJECTED, title: 'Account Rejected', message: `Your account was rejected. Reason: ${reason}` },
      suspended: { type: NOTIFICATION_TYPES.AGENT_SUSPENDED, title: 'Account Suspended', message: `Your account has been suspended. Reason: ${reason}` },
    };
    if (notifMap[status]) await sendNotification({ recipient: agent._id, recipientRole: 'agent', ...notifMap[status], relatedEntity: agent._id, relatedEntityType: 'FieldAgent' });

    res.json({ success: true, data: agent });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Manage Merchants ──────────────────────────────────────────────────────
exports.getMerchants = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) query.$or = [
      { merchantName: new RegExp(search, 'i') },
      { shopName: new RegExp(search, 'i') },
      { mobile: new RegExp(search, 'i') },
    ];

    const total = await Merchant.countDocuments(query);
    const merchants = await Merchant.find(query)
      .populate('assignedAgent', 'fullName email mobile')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: merchants, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approveMerchant = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.params.id).populate('assignedAgent');
    if (!merchant) return res.status(404).json({ success: false, message: 'Merchant not found' });

    merchant.status = 'approved';
    merchant.approvedBy = req.user._id;
    merchant.approvedAt = new Date();
    merchant.statusTimeline.push({ status: 'approved', updatedBy: req.user._id, updatedByRole: 'admin' });
    await merchant.save();

    await createAuditLog({ userId: req.user._id, userRole: 'admin', action: 'MERCHANT_APPROVAL', entityType: 'Merchant', entityId: merchant._id, previousValue: { status: 'under_review' }, newValue: { status: 'approved' }, req });
    await sendNotification({ recipient: merchant.assignedAgent._id, recipientRole: 'agent', type: NOTIFICATION_TYPES.MERCHANT_APPROVED, title: 'Merchant Approved', message: `${merchant.merchantName} has been approved`, relatedEntity: merchant._id, relatedEntityType: 'Merchant' });

    res.json({ success: true, data: merchant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.rejectMerchant = async (req, res) => {
  try {
    const { reason } = req.body;
    const merchant = await Merchant.findById(req.params.id).populate('assignedAgent');
    if (!merchant) return res.status(404).json({ success: false, message: 'Merchant not found' });

    merchant.status = 'rejected';
    merchant.rejectionReason = reason;
    merchant.statusTimeline.push({ status: 'rejected', updatedBy: req.user._id, updatedByRole: 'admin', note: reason });
    await merchant.save();

    await createAuditLog({ userId: req.user._id, userRole: 'admin', action: 'MERCHANT_REJECTION', entityType: 'Merchant', entityId: merchant._id, newValue: { status: 'rejected', reason }, req });
    await sendNotification({ recipient: merchant.assignedAgent._id, recipientRole: 'agent', type: NOTIFICATION_TYPES.MERCHANT_REJECTED, title: 'Merchant Rejected', message: `${merchant.merchantName} was rejected. Reason: ${reason}`, relatedEntity: merchant._id, relatedEntityType: 'Merchant' });

    res.json({ success: true, data: merchant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── QR Management ─────────────────────────────────────────────────────────
exports.uploadQRCode = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'QR image required' });
    const merchant = await Merchant.findById(req.params.merchantId).populate('assignedAgent');
    if (!merchant) return res.status(404).json({ success: false, message: 'Merchant not found' });
    if (merchant.status !== 'approved') return res.status(400).json({ success: false, message: 'Merchant must be approved before QR upload' });

    const qr = await QRCode.create({ merchant: merchant._id, publicId: req.file.public_id, url: req.file.secure_url, uploadedBy: req.user._id, status: 'uploaded' });

    merchant.qrCode = qr._id;
    merchant.status = 'qr_uploaded';
    merchant.statusTimeline.push({ status: 'qr_uploaded', updatedBy: req.user._id, updatedByRole: 'admin' });
    await merchant.save();

    await createAuditLog({ userId: req.user._id, userRole: 'admin', action: 'QR_UPLOAD', entityType: 'Merchant', entityId: merchant._id, req });
    await sendNotification({ recipient: merchant.assignedAgent._id, recipientRole: 'agent', type: NOTIFICATION_TYPES.QR_UPLOADED, title: 'QR Code Uploaded', message: `QR code uploaded for ${merchant.merchantName}`, relatedEntity: merchant._id, relatedEntityType: 'Merchant' });

    res.json({ success: true, data: { qr, merchant } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deployQR = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.params.merchantId).populate('assignedAgent');
    if (!merchant || merchant.status !== 'qr_uploaded') return res.status(400).json({ success: false, message: 'Invalid merchant status for QR deployment' });

    await QRCode.findByIdAndUpdate(merchant.qrCode, { status: 'deployed', deployedAt: new Date() });

    merchant.status = 'qr_deployed';
    merchant.statusTimeline.push({ status: 'qr_deployed', updatedBy: req.user._id, updatedByRole: 'admin' });
    await merchant.save();

    await createAuditLog({ userId: req.user._id, userRole: 'admin', action: 'QR_DEPLOYMENT', entityType: 'Merchant', entityId: merchant._id, req });
    await sendNotification({ recipient: merchant.assignedAgent._id, recipientRole: 'agent', type: NOTIFICATION_TYPES.QR_DEPLOYED, title: 'QR Deployed', message: `QR deployed for ${merchant.merchantName}`, relatedEntity: merchant._id, relatedEntityType: 'Merchant' });

    res.json({ success: true, data: merchant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Transaction Verification & 7-Day Validation ──────────────────────────
exports.recordTransaction = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.params.merchantId);
    if (!merchant || !['qr_deployed', 'transaction_verified', '7day_validation'].includes(merchant.status)) {
      return res.status(400).json({ success: false, message: 'Merchant not in valid state for transactions' });
    }

    merchant.transactionCount += 1;
    if (!merchant.firstTransactionDate) merchant.firstTransactionDate = new Date();

    if (merchant.transactionCount >= 1 && !merchant.transactionVerified) {
      merchant.transactionVerified = true;
      merchant.status = 'transaction_verified';
      merchant.validationStartDate = new Date();
      merchant.validationEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      merchant.statusTimeline.push({ status: 'transaction_verified', updatedBy: req.user._id, updatedByRole: 'admin' });
    }

    await merchant.save();
    await createAuditLog({ userId: req.user._id, userRole: 'admin', action: 'TRANSACTION_VALIDATION', entityType: 'Merchant', entityId: merchant._id, req });
    res.json({ success: true, data: merchant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.activateMerchant = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.params.merchantId).populate('assignedAgent');
    if (!merchant) return res.status(404).json({ success: false, message: 'Merchant not found' });

    // Mandatory validation checks
    if (!merchant.transactionVerified) return res.status(400).json({ success: false, message: 'Transaction verification required' });
    if (!merchant.validationEndDate || new Date() < merchant.validationEndDate) {
      return res.status(400).json({ success: false, message: '7-day validation period not yet completed' });
    }

    merchant.status = 'active';
    merchant.activationDate = new Date();
    merchant.statusTimeline.push({ status: 'active', updatedBy: req.user._id, updatedByRole: 'admin' });
    await merchant.save();

    await QRCode.findByIdAndUpdate(merchant.qrCode, { status: 'active', activatedAt: new Date() });

    // Check commission eligibility
    await exports.checkCommissionEligibility(merchant, req.user._id, req);

    await createAuditLog({ userId: req.user._id, userRole: 'admin', action: 'MERCHANT_ACTIVATION', entityType: 'Merchant', entityId: merchant._id, req });
    await sendNotification({ recipient: merchant.assignedAgent._id, recipientRole: 'agent', type: NOTIFICATION_TYPES.MERCHANT_ACTIVATED, title: 'Merchant Activated', message: `${merchant.merchantName} is now active!`, relatedEntity: merchant._id, relatedEntityType: 'Merchant' });

    res.json({ success: true, data: merchant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.checkCommissionEligibility = async (merchant, adminId, req) => {
  const checks = merchant.status === 'active' && merchant.transactionVerified && merchant.validationEndDate && new Date() >= merchant.validationEndDate;

  if (checks && !merchant.commissionEligible) {
    merchant.commissionEligible = true;
    merchant.commissionEligibleDate = new Date();
    merchant.status = 'commission_eligible';
    merchant.statusTimeline.push({ status: 'commission_eligible', updatedBy: adminId, updatedByRole: 'admin' });
    await merchant.save();

    await Commission.create({ agent: merchant.assignedAgent, merchant: merchant._id, eligibleAt: new Date(), month: new Date().toISOString().slice(0, 7) });

    await createAuditLog({ userId: adminId, userRole: 'admin', action: 'COMMISSION_ELIGIBILITY', entityType: 'Merchant', entityId: merchant._id, req });
    await sendNotification({ recipient: merchant.assignedAgent, recipientRole: 'agent', type: NOTIFICATION_TYPES.COMMISSION_ELIGIBLE, title: 'Commission Eligible!', message: `${merchant.merchantName} is now commission eligible`, relatedEntity: merchant._id, relatedEntityType: 'Merchant' });
  }
};

// ─── Get Signed Document URLs (Admin Only) ────────────────────────────────
exports.getMerchantDocuments = async (req, res) => {
  try {
    const docs = await MerchantDocument.findOne({ merchant: req.params.merchantId });
    if (!docs) return res.status(404).json({ success: false, message: 'Documents not found' });

    // Generate signed URLs for each document
    const signedDocs = {};
    for (const [key, doc] of Object.entries(docs.documents)) {
      if (doc && doc.publicId) {
        signedDocs[key] = { ...doc, signedUrl: getSignedUrl(doc.publicId) };
      }
    }

    res.json({ success: true, data: { ...docs.toObject(), signedDocuments: signedDocs } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Audit Logs ────────────────────────────────────────────────────────────
exports.getAuditLogs = async (req, res) => {
  try {
    const { entityType, action, page = 1, limit = 20 } = req.query;
    const query = {};
    if (entityType) query.entityType = entityType;
    if (action) query.action = new RegExp(action, 'i');

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(Number(limit));
    res.json({ success: true, data: logs, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ===============================
// Upload Invoice
// ===============================
// ===============================
// Upload Invoice
// ===============================

exports.uploadInvoice = async (req, res) => {
  try {

    const {
      agent,
      month,
      amount,
      type
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Invoice PDF is required"
      });
    }

    const invoice = await Invoice.create({
      agent,
      type: type || "monthly",
      month,
      amount: amount || 0,

      filePublicId: req.file.public_id,
      fileUrl: req.file.secure_url,

      status: "issued",
      issuedAt: new Date()
    });

    res.json({
      success: true,
      message: "Invoice uploaded successfully",
      data: invoice
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};


// ===============================
// Get All Invoices
// ===============================

exports.getInvoices = async (req, res) => {

  try {

    const invoices = await Invoice.find()
      .populate(
        "agent",
        "fullName email mobile"
      )
      .sort({
        createdAt: -1
      });

    res.json({
      success: true,
      data: invoices
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};