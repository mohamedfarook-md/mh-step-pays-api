const MerchantDocument = require('../models/MerchantDocument');
const Merchant = require('../models/Merchant');
const { createAuditLog } = require('../utils/auditLogger');

// Upload one or more documents for a merchant
exports.uploadDocuments = async (req, res) => {
  try {
    const { merchantId } = req.params;
    const merchant = await Merchant.findOne({ _id: merchantId, assignedAgent: req.user._id });
    if (!merchant) return res.status(404).json({ success: false, message: 'Merchant not found' });

    let docRecord = await MerchantDocument.findOne({ merchant: merchantId });
    if (!docRecord) {
      docRecord = new MerchantDocument({ merchant: merchantId, uploadedBy: req.user._id });
    }

    // req.files is a map of fieldname -> array of files (multer fields)
    const fieldMap = {
      aadhaarFront: 'aadhaarFront', aadhaarBack: 'aadhaarBack',
      panFront: 'panFront', panBack: 'panBack',
      utilityBill: 'utilityBill', bankDocument: 'bankDocument',
      gstOrAgreement: 'gstOrAgreement', shopPhoto: 'shopPhoto',
      shopBoardPhoto: 'shopBoardPhoto',
    };

    for (const [field] of Object.entries(fieldMap)) {
      if (req.files && req.files[field] && req.files[field][0]) {
        const file = req.files[field][0];
        docRecord.documents[field] = { publicId: file.public_id, url: file.secure_url, uploadedAt: new Date() };
      }
    }

    await docRecord.save();
    await createAuditLog({ userId: req.user._id, userRole: 'agent', action: 'DOCUMENT_UPLOAD', entityType: 'MerchantDocument', entityId: docRecord._id, req });

    res.json({ success: true, data: docRecord });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin verify documents
exports.verifyDocuments = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const docs = await MerchantDocument.findOne({ merchant: req.params.merchantId });
    if (!docs) return res.status(404).json({ success: false, message: 'Documents not found' });

    docs.verificationStatus = status;
    docs.verifiedBy = req.user._id;
    docs.verifiedAt = new Date();
    if (notes) docs.rejectionNotes = notes;
    await docs.save();

    if (status === 'verified') {
      await Merchant.findByIdAndUpdate(req.params.merchantId, {
        status: 'under_review',
        $push: { statusTimeline: { status: 'under_review', updatedBy: req.user._id, updatedByRole: 'admin' } }
      });
    }

    await createAuditLog({ userId: req.user._id, userRole: 'admin', action: 'DOCUMENT_VERIFICATION', entityType: 'MerchantDocument', entityId: docs._id, newValue: { status }, req });
    res.json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};