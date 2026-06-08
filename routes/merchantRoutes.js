// merchantRoutes.js
const express = require('express');
const router = express.Router();
const { protect, agentOnly, adminOnly } = require('../middleware/auth');
const mc = require('../controllers/merchantController');
const dc = require('../controllers/documentController');
const { uploadMerchantDoc } = require('../config/cloudinary');

const docFields = uploadMerchantDoc.fields([
  { name: 'aadhaarFront', maxCount: 1 }, { name: 'aadhaarBack', maxCount: 1 },
  { name: 'panFront', maxCount: 1 }, { name: 'panBack', maxCount: 1 },
  { name: 'utilityBill', maxCount: 1 }, { name: 'bankDocument', maxCount: 1 },
  { name: 'gstOrAgreement', maxCount: 1 }, { name: 'shopPhoto', maxCount: 1 },
  { name: 'shopBoardPhoto', maxCount: 1 },
]);

router.use(protect);

router.post('/', agentOnly, mc.createMerchant);
router.get('/my', agentOnly, mc.getMyMerchants);
router.get('/stats', agentOnly, mc.getAgentStats);
router.get('/:id', mc.getMerchant);
router.put('/:id', agentOnly, mc.updateMerchant);
router.post('/:id/submit', agentOnly, mc.submitMerchant);
router.post('/:merchantId/documents', agentOnly, docFields, dc.uploadDocuments);

module.exports = router;