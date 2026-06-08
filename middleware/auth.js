const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const FieldAgent = require('../models/FieldAgent');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === 'admin') {
      req.user = await Admin.findById(decoded.id).select('-password');
    } else {
      req.user = await FieldAgent.findById(decoded.id).select('-password');
      if (req.user && req.user.status !== 'approved') {
        return res.status(403).json({ success: false, message: 'Account not approved' });
      }
    }
    req.user.role = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

const agentOnly = (req, res, next) => {
  if (req.user.role !== 'agent') {
    return res.status(403).json({ success: false, message: 'Agent access required' });
  }
  next();
};

module.exports = { protect, adminOnly, agentOnly };