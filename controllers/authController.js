const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const FieldAgent = require('../models/FieldAgent');
const { AttendanceLog } = require('../models/index');
const { createAuditLog } = require('../utils/auditLogger');
const { sendNotification, NOTIFICATION_TYPES } = require('../utils/notifications');

const generateToken = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// Admin Login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    await createAuditLog({ userId: admin._id, userRole: 'admin', action: 'USER_LOGIN', entityType: 'Admin', entityId: admin._id, req });
    res.json({ success: true, token: generateToken(admin._id, 'admin'), user: { id: admin._id, name: admin.name, email: admin.email, role: 'admin' } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Agent Register
exports.agentRegister = async (req, res) => {
  try {
    const { fullName, email, mobile, employmentType, password, termsAccepted } = req.body;
    if (!termsAccepted) return res.status(400).json({ success: false, message: 'Terms & Conditions must be accepted' });

    const exists = await FieldAgent.findOne({ $or: [{ email }, { mobile }] });
    if (exists) return res.status(400).json({ success: false, message: 'Email or mobile already registered' });

    const agent = await FieldAgent.create({ fullName, email, mobile, employmentType, password, termsAccepted });

    // Notify admin
    const admins = await Admin.find({ isActive: true });
    for (const admin of admins) {
      await sendNotification({ recipient: admin._id, recipientRole: 'admin', type: NOTIFICATION_TYPES.NEW_AGENT_REGISTRATION, title: 'New Agent Registration', message: `${fullName} has registered as a Field Agent`, relatedEntity: agent._id, relatedEntityType: 'FieldAgent' });
    }

    await createAuditLog({ userId: agent._id, userRole: 'agent', action: 'AGENT_REGISTRATION', entityType: 'FieldAgent', entityId: agent._id, newValue: { fullName, email, mobile }, req });
    res.status(201).json({ success: true, message: 'Registration submitted. Awaiting admin approval.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Agent Login
exports.agentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const agent = await FieldAgent.findOne({ email });
    if (!agent || !(await agent.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (agent.status === 'pending') return res.status(403).json({ success: false, message: 'Account pending admin approval' });
    if (agent.status === 'rejected') return res.status(403).json({ success: false, message: 'Account rejected. Contact admin.' });
    if (agent.status === 'suspended') return res.status(403).json({ success: false, message: 'Account suspended. Contact admin.' });

    // Start attendance
    await AttendanceLog.create({ agent: agent._id, loginTime: new Date(), date: new Date().toISOString().split('T')[0], ipAddress: req.ip });

    agent.lastLogin = new Date();
    await agent.save();

    await createAuditLog({ userId: agent._id, userRole: 'agent', action: 'USER_LOGIN', entityType: 'FieldAgent', entityId: agent._id, req });

    res.json({ success: true, token: generateToken(agent._id, 'agent'), user: { id: agent._id, name: agent.fullName, email: agent.email, role: 'agent' } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    if (req.user.role === 'agent') {
      const log = await AttendanceLog.findOne({ agent: req.user._id, logoutTime: null }).sort({ loginTime: -1 });
      if (log) {
        log.logoutTime = new Date();
        log.sessionDuration = Math.round((new Date() - log.loginTime) / 60000);
        await log.save();
        await FieldAgent.findByIdAndUpdate(req.user._id, { $inc: { totalWorkingHours: log.sessionDuration / 60 } });
      }
    }
    await createAuditLog({ userId: req.user._id, userRole: req.user.role, action: 'USER_LOGOUT', entityType: req.user.role === 'admin' ? 'Admin' : 'FieldAgent', entityId: req.user._id, req });
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};