const mongoose = require('mongoose');

// ─── QR Code ───────────────────────────────────────────────────────────────
const qrCodeSchema = new mongoose.Schema({
  merchant: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  publicId: { type: String, required: true },
  url: { type: String, required: true },
  status: { type: String, enum: ['pending', 'uploaded', 'deployed', 'active'], default: 'uploaded' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  uploadedAt: { type: Date, default: Date.now },
  deployedAt: { type: Date },
  activatedAt: { type: Date },
}, { timestamps: true });

// ─── Notification ──────────────────────────────────────────────────────────
const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, required: true },
  recipientRole: { type: String, enum: ['admin', 'agent'], required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  relatedEntity: { type: mongoose.Schema.Types.ObjectId },
  relatedEntityType: { type: String },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

// ─── Attendance Log ────────────────────────────────────────────────────────
const attendanceLogSchema = new mongoose.Schema({
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'FieldAgent', required: true },
  loginTime: { type: Date, required: true },
  logoutTime: { type: Date },
  sessionDuration: { type: Number }, // minutes
  date: { type: String }, // YYYY-MM-DD
  ipAddress: { type: String },
}, { timestamps: true });

// ─── Audit Log ─────────────────────────────────────────────────────────────
const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userRole: { type: String, required: true },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  previousValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: false });

// ─── Commission ────────────────────────────────────────────────────────────
const commissionSchema = new mongoose.Schema({
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'FieldAgent', required: true },
  merchant: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  amount: { type: Number },
  status: { type: String, enum: ['pending', 'approved', 'paid'], default: 'pending' },
  eligibleAt: { type: Date },
  paidAt: { type: Date },
  month: { type: String }, // YYYY-MM
}, { timestamps: true });

// ─── Invoice ───────────────────────────────────────────────────────────────
// const invoiceSchema = new mongoose.Schema({
//   agent: { type: mongoose.Schema.Types.ObjectId, ref: 'FieldAgent' },
//   type: { type: String, enum: ['monthly', 'commission', 'settlement'], required: true },
//   month: { type: String }, // YYYY-MM
//   amount: { type: Number },
//   filePublicId: { type: String },
//   fileUrl: { type: String },
//   status: { type: String, enum: ['draft', 'issued', 'paid'], default: 'draft' },
//   issuedAt: { type: Date },
// }, { timestamps: true });
const invoiceSchema = new mongoose.Schema({

  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FieldAgent',
    required: true
  },

  type: {
    type: String,
    enum: ['monthly', 'commission', 'settlement'],
    default: 'monthly'
  },

  month: {
    type: String,
    required: true
  },

  amount: {
    type: Number,
    default: 0
  },

  filePublicId: {
    type: String,
    required: true
  },

  fileUrl: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ['draft', 'issued', 'paid'],
    default: 'issued'
  },

  issuedAt: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true
});
module.exports = {
  QRCode: mongoose.model('QRCode', qrCodeSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  AttendanceLog: mongoose.model('AttendanceLog', attendanceLogSchema),
  AuditLog: mongoose.model('AuditLog', auditLogSchema),
  Commission: mongoose.model('Commission', commissionSchema),
  Invoice: mongoose.model('Invoice', invoiceSchema),
};