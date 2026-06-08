const { AuditLog } = require('../models/index');

const createAuditLog = async ({ userId, userRole, action, entityType, entityId, previousValue, newValue, req }) => {
  try {
    await AuditLog.create({
      userId,
      userRole,
      action,
      entityType,
      entityId,
      previousValue,
      newValue,
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'],
      userAgent: req?.headers?.['user-agent'],
    });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

module.exports = { createAuditLog };