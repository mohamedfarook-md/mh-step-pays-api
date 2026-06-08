const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const fieldAgentSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  mobile: { type: String, required: true, unique: true },
  employmentType: { type: String, enum: ['part_time', 'full_time'], required: true },
  password: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending',
  },
  termsAccepted: { type: Boolean, required: true, default: false },
  rejectionReason: { type: String },
  suspensionReason: { type: String },
  approvedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  lastLogin: { type: Date },
  totalWorkingHours: { type: Number, default: 0 },
}, { timestamps: true });

fieldAgentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

fieldAgentSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('FieldAgent', fieldAgentSchema);