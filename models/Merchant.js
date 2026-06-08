const mongoose = require('mongoose');

const merchantSchema = new mongoose.Schema({
  // Basic Info
  merchantName: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, unique: true },
  email: { type: String, lowercase: true },
  shopName: { type: String, required: true },
  businessCategory: { type: String, required: true },
  address: { type: String, required: true },

  // KYC Fields (stored as encrypted references)
  aadhaarNumber: { type: String },
  panNumber: { type: String },

  // Assigned Agent
  assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'FieldAgent', required: true },

  // Status Workflow
  status: {
    type: String,
    enum: [
      'draft', 'submitted', 'under_review', 'approved',
      'qr_uploaded', 'qr_deployed', 'transaction_verified',
      '7day_validation', 'active', 'commission_eligible',
      'completed', 'rejected'
    ],
    default: 'draft',
  },

  rejectionReason: { type: String },

  // Status Timeline
  statusTimeline: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId },
    updatedByRole: { type: String },
    note: String,
  }],

  // QR Info
  qrCode: { type: mongoose.Schema.Types.ObjectId, ref: 'QRCode' },

  // Transaction Tracking
  firstTransactionDate: { type: Date },
  transactionCount: { type: Number, default: 0 },
  transactionVerified: { type: Boolean, default: false },

  // Activation
  activationDate: { type: Date },
  validationStartDate: { type: Date },
  validationEndDate: { type: Date },

  // Commission
  commissionEligible: { type: Boolean, default: false },
  commissionEligibleDate: { type: Date },

  // Admin
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  approvedAt: { type: Date },

}, { timestamps: true });

// Indexes for duplicate prevention
merchantSchema.index({ mobile: 1 }, { unique: true });
merchantSchema.index({ aadhaarNumber: 1 }, { sparse: true });
merchantSchema.index({ panNumber: 1 }, { sparse: true });

module.exports = mongoose.model('Merchant', merchantSchema);