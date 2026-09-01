// // merchantRoutes.js
// const express = require('express');
// const router = express.Router();
// const { protect, agentOnly, adminOnly } = require('../middleware/auth');
// const mc = require('../controllers/merchantController');
// const dc = require('../controllers/documentController');
// const { uploadMerchantDoc } = require('../config/cloudinary');

// const docFields = uploadMerchantDoc.fields([
//   { name: 'aadhaarFront', maxCount: 1 }, { name: 'aadhaarBack', maxCount: 1 },
//   { name: 'panFront', maxCount: 1 }, { name: 'panBack', maxCount: 1 },
//   { name: 'utilityBill', maxCount: 1 }, { name: 'bankDocument', maxCount: 1 },
//   { name: 'gstOrAgreement', maxCount: 1 }, { name: 'shopPhoto', maxCount: 1 },
//   { name: 'shopBoardPhoto', maxCount: 1 },
// ]);

// router.use(protect);

// router.post('/', agentOnly, mc.createMerchant);
// router.get('/my', agentOnly, mc.getMyMerchants);
// router.get('/stats', agentOnly, mc.getAgentStats);
// router.get('/:id', mc.getMerchant);
// router.put('/:id', agentOnly, mc.updateMerchant);
// router.post('/:id/submit', agentOnly, mc.submitMerchant);
// router.post('/:merchantId/documents', agentOnly, docFields, dc.uploadDocuments);

// module.exports = router;


















// merchantRoutes.js

const express = require("express");
const router = express.Router();
const uploadLocal = require("../config/localUpload");
const shopVerificationUpload = uploadLocal.fields([
    { name: "bannerPhoto", maxCount: 1 },
    { name: "insidePhoto", maxCount: 1 },
    { name: "fullShopPhoto", maxCount: 1 },
    { name: "businessPhoto", maxCount: 1 },
]);
const { protect, agentOnly, adminOnly } = require("../middleware/auth");

const mc = require("../controllers/merchantController");
const dc = require("../controllers/documentController");


const { uploadMerchantDoc } = require("../config/cloudinary");

const docFields = uploadMerchantDoc.fields([
  { name: "aadhaarFront", maxCount: 1 },
  { name: "aadhaarBack", maxCount: 1 },
  { name: "panFront", maxCount: 1 },
  { name: "panBack", maxCount: 1 },
  { name: "utilityBill", maxCount: 1 },
  { name: "bankDocument", maxCount: 1 },
  { name: "gstOrAgreement", maxCount: 1 },
  { name: "shopPhoto", maxCount: 1 },
  { name: "shopBoardPhoto", maxCount: 1 },
]);

router.use(protect);

/* ===============================
   STEP 1 - BASIC DETAILS
================================ */

router.post("/basic-details", agentOnly, mc.createMerchant);

router.put(
  "/:merchantId/basic-details",
  agentOnly,
  mc.updateMerchant
);


/* ===============================
   MERCHENT STATUS
================================ */

router.get(
    "/:merchantId/status",
    agentOnly,
    mc.getMerchantStatus
);
/* ===============================
   STEP 2 - PAN VERIFICATION
================================ */

router.post(
  "/:merchantId/pan-verification",
  agentOnly,
  mc.verifyPAN
);


/* ===============================
   STEP 3 - DOCUMENTS
================================ */

router.post(
  "/:merchantId/documents",
  agentOnly,
  docFields,
  dc.uploadDocuments
);

/* ===============================
   STEP 4 - FINAL SUBMIT
================================ */

router.post(
  "/:merchantId/submit",
  agentOnly,
  mc.submitMerchant
);

/* ===============================
   AGENT
================================ */

router.get("/my", agentOnly, mc.getMyMerchants);

router.get("/stats", agentOnly, mc.getAgentStats);

/* ===============================
   VIEW SINGLE MERCHANT
================================ */

router.get("/:merchantId", mc.getMerchant);

router.get(
    "/:merchantId/pan-status",
    agentOnly,
    mc.checkPanStatus
);

// ======================================
// CKYC
// ======================================

// Send CKYC OTP
router.post(
    "/:merchantId/ckyc/send-otp",
    agentOnly,
    mc.sendCKYCOTP
);

// Verify CKYC OTP
router.post(
    "/:merchantId/ckyc/verify-otp",
    agentOnly,
    mc.verifyCKYCOTP
);

// Get CKYC Status
router.get(
    "/:merchantId/ckyc/status",
    agentOnly,
    mc.getCKYCStatus
);


// Skip CKYC
router.post(
  "/:merchantId/ckyc/skip",
  agentOnly,
  mc.skipCKYC
);

// ======================================
// BANK VERIFICATION
// ======================================

router.put(
    "/:merchantId/bank",
    agentOnly,
    mc.updateBankDetails
);

router.post(
    "/:merchantId/bank/verify",
    agentOnly,
    mc.verifyBank
);

router.get(
    "/:merchantId/bank/status",
    agentOnly,
    mc.getBankStatus
);




// ======================================
// BUSINESS INFORMATION
// ======================================

router.put(
  "/:merchantId/business-information",
  agentOnly,
  mc.updateBusinessInformation
);

router.get(
  "/:merchantId/business-information",
  agentOnly,
  mc.getBusinessInformation
);


// ======================================
// WEBSITE DETAILS
// ======================================

router.put(
  "/:merchantId/website",
  agentOnly,
  mc.updateWebsiteDetails
);
// ======================================
// AUTHORIZED SIGNATORY INFORMATION
// ======================================

router.put(
    "/:merchantId/signatory-details",
    agentOnly,
    mc.addSignatoryDetails
);



router.post(
    "/:merchantId/digilocker",
    agentOnly,
    mc.initiateDigiLocker
);

// Check DigiLocker Status
router.get(
    "/:merchantId/digilocker/status",
    agentOnly,
    mc.checkDigiLockerStatus
);


// ======================================
// UBO
// ======================================

router.put(
    "/:merchantId/ubo",
    agentOnly,
    mc.addUBO
);

// ======================================================
// SHOP VERIFICATION
// ======================================================

router.post(
    "/:merchantId/shop-verification",
    agentOnly,
    shopVerificationUpload,
    mc.shopVerification
);
// ======================================================
// UPDATE GEO LOCATION
// ======================================================

router.put(
    "/:id/geo-location",
    agentOnly,
    mc.updateGeoLocation
);



router.post(
    "/:merchantId/upload-document",
    agentOnly,
    uploadLocal.single("document"),
    mc.uploadKYCDocument
);
// ======================================================
// CREATE VKYC PROFILE
// ======================================================

router.post(
    "/:id/vkyc",
    agentOnly,
    mc.createVKYCProfile
);


// router.get(
//     "/:id/required-documents",
//     agentOnly,
//     mc.getRequiredDocuments
// );



router.get(
    "/:merchantId/required-documents",
    agentOnly,
    mc.getRequiredDocuments
);


// ======================================================
// AGREEMENT
// ======================================================

router.get(
    "/:merchantId/agreement/generate",
    agentOnly,
    mc.generateAgreement
);


router.put(
    "/:merchantId/test-integration-type",
    agentOnly,
    mc.testIntegrationType
);

module.exports = router;

