const { Notification } = require('../models/index');

const sendNotification = async ({ recipient, recipientRole, type, title, message, relatedEntity, relatedEntityType }) => {
  try {
    await Notification.create({ recipient, recipientRole, type, title, message, relatedEntity, relatedEntityType });
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

const NOTIFICATION_TYPES = {
  // Agent notifications
  MERCHANT_APPROVED: 'merchant_approved',
  MERCHANT_REJECTED: 'merchant_rejected',
  QR_UPLOADED: 'qr_uploaded',
  QR_DEPLOYED: 'qr_deployed',
  MERCHANT_ACTIVATED: 'merchant_activated',
  COMMISSION_ELIGIBLE: 'commission_eligible',
  AGENT_APPROVED: 'agent_approved',
  AGENT_REJECTED: 'agent_rejected',
  AGENT_SUSPENDED: 'agent_suspended',

  // Admin notifications
  NEW_AGENT_REGISTRATION: 'new_agent_registration',
  NEW_MERCHANT_SUBMISSION: 'new_merchant_submission',
  PENDING_VERIFICATION: 'pending_verification',
  COMMISSION_READY: 'commission_ready',
};

module.exports = { sendNotification, NOTIFICATION_TYPES };