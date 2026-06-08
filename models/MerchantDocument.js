const mongoose = require('mongoose');

const merchantDocumentSchema = new mongoose.Schema({
  merchant: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'FieldAgent', required: true },

  documents: {
    aadhaarFront: { publicId: String, url: String, uploadedAt: Date },
    aadhaarBack:  { publicId: String, url: String, uploadedAt: Date },
    panFront:     { publicId: String, url: String, uploadedAt: Date },
    panBack:      { publicId: String, url: String, uploadedAt: Date },
    utilityBill:  { publicId: String, url: String, uploadedAt: Date },
    bankDocument: { publicId: String, url: String, uploadedAt: Date },
    gstOrAgreement: { publicId: String, url: String, uploadedAt: Date },
    shopPhoto:    { publicId: String, url: String, uploadedAt: Date },
    shopBoardPhoto: { publicId: String, url: String, uploadedAt: Date },
  },

  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
  },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  verifiedAt: { type: Date },
  rejectionNotes: { type: String },

}, { timestamps: true });

module.exports = mongoose.model('MerchantDocument', merchantDocumentSchema);