const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const ac = require('../controllers/adminController');
const dc = require('../controllers/documentController');
const { uploadQR, uploadInvoice } = require('../config/cloudinary');

router.use(protect, adminOnly);

// Dashboard
router.get('/dashboard', ac.getDashboardStats);

// Agents
router.get('/agents', ac.getAgents);
router.put('/agents/:id/status', ac.updateAgentStatus);

// Merchants
router.get('/merchants', ac.getMerchants);
router.put('/merchants/:id/approve', ac.approveMerchant);
router.put('/merchants/:id/reject', ac.rejectMerchant);
router.put('/merchants/:merchantId/transaction', ac.recordTransaction);
router.put('/merchants/:merchantId/activate', ac.activateMerchant);

// Documents
router.get('/merchants/:merchantId/documents', ac.getMerchantDocuments);
router.put('/merchants/:merchantId/documents/verify', dc.verifyDocuments);

// QR
router.post('/merchants/:merchantId/qr', uploadQR.single('qrImage'), ac.uploadQRCode);
router.put('/merchants/:merchantId/qr/deploy', ac.deployQR);

// Invoice
router.post(
  '/invoices/upload',
  uploadInvoice.single('invoice'),
  ac.uploadInvoice
);

router.get(
  '/invoices',
  ac.getInvoices
);

// Audit Logs
router.get('/audit-logs', ac.getAuditLogs);

module.exports = router;