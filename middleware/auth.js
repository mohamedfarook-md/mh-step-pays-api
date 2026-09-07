const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const FieldAgent = require('../models/FieldAgent');
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized',
    });
  }

  // ==========================================
  // 1. EXISTING QR ADMIN / AGENT JWT
  // ==========================================

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === 'admin') {
      req.user = await Admin.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Admin not found',
        });
      }

      req.user.role = 'admin';

      return next();
    }

    if (decoded.role === 'agent') {
      req.user = await FieldAgent.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Agent not found',
        });
      }

      if (req.user.status !== 'approved') {
        return res.status(403).json({
          success: false,
          message: 'Account not approved',
        });
      }

      req.user.role = 'agent';

      return next();
    }
  } catch (qrTokenError) {
    // QR token verification failed.
    // Try Customer JWT below.
  }

  // ==========================================
  // 2. CUSTOMER JWT
  // ==========================================

 // ==========================================
// 2. CUSTOMER JWT
// ==========================================

try {
  const customerDecoded = jwt.verify(
    token,
    process.env.CUSTOMER_JWT_SECRET
  );

  if (!customerDecoded.userId) {
    return res.status(401).json({
      success: false,
      message: 'Invalid customer token',
    });
  }

  req.user = {
    _id: customerDecoded.userId,
    role: 'customer',
    userType: 'customer',
  };

  return next();

} catch (customerTokenError) {
  console.error(
    'CUSTOMER AUTH ERROR:',
    customerTokenError.message
  );

  return res.status(401).json({
    success: false,
    message: 'Token invalid',
  });
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