const Merchant = require('../models/Merchant');
const MerchantDocument = require('../models/MerchantDocument');
const { QRCode, Commission, Invoice } = require('../models/index');
const { createAuditLog } = require('../utils/auditLogger');
const { sendNotification, NOTIFICATION_TYPES } = require('../utils/notifications');
const { uploadMerchantDoc } = require('../config/cloudinary');
const Admin = require('../models/Admin');
const payuService = require("../services/payuService");


// ─── Duplicate Check Helper ────────────────────────────────────────────────
// const checkDuplicate = async (mobile, aadhaarNumber, panNumber, excludeId = null) => {
//   // const query = { $or: [{ mobile }] };
//   const query = {
//     mobile,
//   };
//   if (excludeId) {
//     query._id = { $ne: excludeId };
//   }
//   if (aadhaarNumber) query.$or.push({ aadhaarNumber });
//   if (panNumber) query.$or.push({ panNumber });
//   if (excludeId) query._id = { $ne: excludeId };

//   const existing = await Merchant.findOne(query);
//   if (!existing) return null;

//   if (existing.mobile === mobile) return 'Mobile number already registered';
//   if (aadhaarNumber && existing.aadhaarNumber === aadhaarNumber) return 'Aadhaar number already registered';
//   if (panNumber && existing.panNumber === panNumber) return 'PAN number already registered';
//   return 'Duplicate merchant found';
// };


const checkDuplicate = async (
  mobile,
  aadhaarNumber,
  panNumber,
  excludeId = null
) => {
  const query = { $or: [] };

  if (mobile) query.$or.push({ mobile });
  if (aadhaarNumber) query.$or.push({ aadhaarNumber });
  if (panNumber) query.$or.push({ panNumber });

  if (query.$or.length === 0) {
    return null;
  }

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existing = await Merchant.findOne(query);

  if (!existing) return null;

  if (mobile && existing.mobile === mobile) {
    return "Mobile number already registered";
  }

  if (aadhaarNumber && existing.aadhaarNumber === aadhaarNumber) {
    return "Aadhaar number already registered";
  }

  if (panNumber && existing.panNumber === panNumber) {
    return "PAN number already registered";
  }

  return "Duplicate merchant found";
};

// ─── Create Merchant (Draft) ───────────────────────────────────────────────
// exports.createMerchant = async (req, res) => {
//   try {
//     // const { merchantName, mobile, email, shopName, businessCategory, address, aadhaarNumber, panNumber } = req.body;

//     const {
//   merchantName,
//   mobile,
//   email,
//   shopName,
//   address,
//   entityType
// } = req.body;
//     // const dupError = await checkDuplicate(mobile, aadhaarNumber, panNumber);
//     const dupError = await checkDuplicate(mobile);
//     if (dupError) return res.status(409).json({ success: false, message: dupError });

//     const merchant = await Merchant.create({
//       merchantName, mobile, email, shopName, businessCategory, address,
//       aadhaarNumber, panNumber,
//       assignedAgent: req.user._id,
//       status: 'draft',
//       statusTimeline: [{ status: 'draft', updatedBy: req.user._id, updatedByRole: 'agent', note: 'Merchant created' }],
//     });

//     await createAuditLog({ userId: req.user._id, userRole: 'agent', action: 'MERCHANT_SUBMISSION', entityType: 'Merchant', entityId: merchant._id, newValue: { merchantName, mobile }, req });

//     res.status(201).json({ success: true, data: merchant });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };


exports.createMerchant = async (req, res) => {
  try {

   const {
    merchantName,
    mobile,
    email,
    shopName,
    address,
    entityType,
    merchantType
} = req.body;

    const dupError = await checkDuplicate(mobile);

    if (dupError) {
      return res.status(409).json({
        success: false,
        message: dupError,
      });
    }

    const merchant = await Merchant.create({
      merchantName,
      mobile,
      email,
      shopName,
      address,
      entityType,
      merchantType,

      assignedAgent: req.user._id,

      status: "draft",

      
      onboardingStep: 1,

      basicDetailsCompleted: false,

currentSection: "basic_details",

      statusTimeline: [
        {
          status: "draft",
          updatedBy: req.user._id,
          updatedByRole: "agent",
          note: "Basic Details Saved",
        },
      ],
    });

    // ======================================
// PAYU MERCHANT CREATE (COMING NEXT)
// ======================================
try {

  console.log("Entity Type :", merchant.entityType);
console.log("Merchant Type :", merchant.merchantType);

    const payuResponse = await payuService.createMerchant(merchant);


    console.log("========== PAYU RESPONSE ==========");
console.log(JSON.stringify(payuResponse, null, 2));
console.log("==================================");

    if (payuResponse.success) {

     merchant.payuMerchantId =
    payuResponse.data.merchant.mid;

merchant.payuMerchantUUID =
    payuResponse.data.merchant.uuid;

merchant.payuProductUUID =
    payuResponse.data.merchant.product_account_uuid || null;

        merchant.payuStatus = "CREATED";

        merchant.payuSyncAt = new Date();
        merchant.basicDetailsCompleted = true;
        merchant.currentSection = "entity";

        await merchant.save();

  } else {

    merchant.payuStatus = "REJECTED";

    await merchant.save();

    console.error("PayU Error :", payuResponse.data);

    return res.status(500).json({
        success: false,
        message: "PayU merchant creation failed.",
        error: payuResponse.data,
    });

}

} catch (error) {

    merchant.payuStatus = "REJECTED";

    await merchant.save();

    console.error(error.message);

    return res.status(500).json({
        success: false,
        message: "Unable to create merchant in PayU.",
        error: error.message,
    });

}




    await createAuditLog({
      userId: req.user._id,
      userRole: "agent",
      action: "MERCHANT_CREATED",
      entityType: "Merchant",
      entityId: merchant._id,
      newValue: {
        merchantName,
        mobile,
      },
      req,
    });

    return res.status(201).json({
    success: true,
    message: "Basic Details Saved Successfully",

    data: {
        merchantId: merchant._id,
        entityType: merchant.entityType,
        onboardingStep: merchant.onboardingStep,
        currentSection: merchant.currentSection,

        payuStatus: merchant.payuStatus,

        payuMerchantId: merchant.payuMerchantId,

        payuMerchantUUID: merchant.payuMerchantUUID,
    },
});

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================================
//  MERCHENT STATUS
// ======================================



exports.getMerchantStatus = async (req, res) => {
    try {

        const { merchantId } = req.params;

        const merchant = await Merchant.findById(merchantId);

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: "Merchant not found"
            });
        }

        const payuResponse = await payuService.getMerchantStatus(
            merchant.payuMerchantUUID
        );

        if (!payuResponse.success) {
            return res.status(500).json({
                success: false,
                message: "Unable to fetch merchant status.",
                error: payuResponse.data
            });
        }

        return res.status(200).json({
            success: true,
            data: payuResponse.data
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};










// ======================================
// STEP 2 - PAN VERIFICATION
// ======================================

exports.verifyPAN = async (req, res) => {
  try {
    const { merchantId } = req.params;
    const { panNumber, panName, dob } = req.body;

    // PAN Required
    if (!panNumber) {
      return res.status(400).json({
        success: false,
        message: "PAN Number is required",
      });
    }

    // PAN Format Validation
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    if (!panRegex.test(panNumber.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid PAN Number",
      });
    }

    // Merchant Check
    const merchant = await Merchant.findOne({
      _id: merchantId,
      assignedAgent: req.user._id,
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      });
    }

    // Duplicate PAN Check
    const duplicate = await checkDuplicate(
      null,
      null,
      panNumber.toUpperCase(),
      merchant._id
    );

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: duplicate,
      });
    }

    if (!merchant.payuMerchantUUID) {
    return res.status(400).json({
        success: false,
        message: "PayU Merchant UUID not found"
    });
}


    // ======================================
// UPDATE PAN IN PAYU
// ======================================
const payuResponse = await payuService.updatePanAndDOB(
    merchant.payuMerchantUUID,
    {
        panNumber: panNumber.toUpperCase(),
        panName,
        dob,
    }
);

if (!payuResponse.success) {
    return res.status(500).json({
        success: false,
        message: "Unable to update PAN in PayU.",
        error: payuResponse.data,
    });
}

merchant.panNumber = panNumber.toUpperCase();
merchant.authorizedSignatory.panNumber = panNumber.toUpperCase();
merchant.dob = dob;
merchant.panName = panName;
merchant.onboardingStep = 2;
merchant.currentSection = "ckyc";

await merchant.save();

return res.status(200).json({
    success: true,
    message: "PAN submitted successfully. Verification in progress.",
    data: {
        merchantId: merchant._id,
        currentSection: merchant.currentSection,
        nextStep: "CKYC_VERIFICATION",
    },
});

} catch (err) {
    console.error("Verify PAN Error:", err);

    return res.status(500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
}
};


exports.sendCKYCOTP = async (req, res) => {
  try {
    const { merchantId } = req.params;
    const { aadhaarNumber } = req.body;
     
    if (!aadhaarNumber) {
  return res.status(400).json({
    success: false,
    message: "Aadhaar Number is required"
  });
}
    const merchant = await Merchant.findOne({
      _id: merchantId,
      assignedAgent: req.user._id,
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      });
    }

    // if (!merchant.panVerified) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Complete PAN verification first.",
    //   });
    // }


    // ======================================
// SUBMIT CONSENT
// ======================================

const consentResponse = await payuService.submitConsents(
    merchant.payuMerchantUUID
);

console.log("========== CONSENT RESPONSE ==========");
console.log(JSON.stringify(consentResponse, null, 2));

if (!consentResponse.success) {

    return res.status(500).json({
        success: false,
        message: "Unable to submit consent.",
        error: consentResponse.data,
    });

}

    const payuResponse = await payuService.sendCKYCOTP(
      merchant.payuMerchantId,
      merchant.mobile
);

    if (!payuResponse.success) {
      return res.status(500).json({
        success: false,
        message: "Unable to send CKYC OTP",
        error: payuResponse.data,
      });
    }

    merchant.aadhaarNumber = aadhaarNumber;
    merchant.ckyc.status = "INITIATED";
    merchant.onboardingStep = 3;
    merchant.currentSection = "ckyc";

    await merchant.save();

    return res.status(200).json({
      success: true,
      message: "CKYC OTP sent successfully.",
      data: payuResponse.data,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};






 // ======================================
// CKYC IN PAYU
// ======================================



exports.verifyCKYCOTP = async (req, res) => {
  try {
    const { merchantId } = req.params;
    const { otp } = req.body;

    const merchant = await Merchant.findOne({
      _id: merchantId,
      assignedAgent: req.user._id,
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      });
    }

   const payuResponse = await payuService.verifyCKYCOTP(
      merchant.payuMerchantId,
      otp
);

    if (!payuResponse.success) {
      return res.status(500).json({
        success: false,
        message: "CKYC verification failed",
        error: payuResponse.data,
      });
    }

    merchant.ckycVerified = true;
    merchant.ckyc.status = "VERIFIED";
    merchant.ckyc.verifiedAt = new Date();

    merchant.onboardingStep = 4;
    merchant.currentSection = "bank_verification";

    await merchant.save();

    return res.status(200).json({
      success: true,
      message: "CKYC verified successfully.",
      nextStep: "BANK_VERIFICATION",
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


exports.getCKYCStatus = async (req, res) => {
  try {
    const { merchantId } = req.params;

    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      });
    }

   const payuResponse = await payuService.fetchCKYC(
      merchant.payuMerchantId
);

    return res.status(200).json({
      success: true,
      data: payuResponse.data,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// ======================================
// SKIP CKYC
// ======================================

exports.skipCKYC = async (req, res) => {
  try {

    const { merchantId } = req.params;

    const merchant = await Merchant.findOne({
      _id: merchantId,
      assignedAgent: req.user._id,
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      });
    }

    // Submit skip CKYC consent to PayU
    const consentResponse =
      await payuService.submitConsents(
        merchant.payuMerchantUUID
      );

    console.log(
      "========== SKIP CKYC CONSENT RESPONSE =========="
    );

    console.log(
      JSON.stringify(
        consentResponse,
        null,
        2
      )
    );

    if (!consentResponse.success) {
      return res.status(500).json({
        success: false,
        message: "Unable to skip CKYC.",
        error: consentResponse.data,
      });
    }

    // Save CKYC skipped status in MongoDB
    merchant.ckyc.status = "SKIPPED";
    merchant.ckycVerified = false;

    merchant.onboardingStep = 4;
    merchant.currentSection = "bank_verification";

    await merchant.save();

    return res.status(200).json({
      success: true,
      message: "CKYC skipped successfully.",
      nextStep: "BANK_VERIFICATION",
      data: {
        merchantId: merchant._id,
        ckycStatus: merchant.ckyc.status,
        onboardingStep: merchant.onboardingStep,
        currentSection: merchant.currentSection,
      },
    });

  } catch (err) {

    console.error(
      "SKIP CKYC ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// ======================================
//  BANK IN PAYU
// ======================================

exports.updateBankDetails = async (req, res) => {
    try {

        const { merchantId } = req.params;

        const {
            accountHolderName,
            accountNumber,
            ifsc,
            bankName,
            branchName
        } = req.body;

        const merchant = await Merchant.findOne({
            _id: merchantId,
            assignedAgent: req.user._id
        });

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: "Merchant not found"
            });
        }

        const payuResponse = await payuService.updateBank(
    merchant.payuMerchantUUID,
    {
        accountHolder: accountHolderName,
        accountNumber,
        ifsc
    }
);

        if (!payuResponse.success) {
            return res.status(500).json({
                success: false,
                message: "Unable to update bank details.",
                error: payuResponse.data
            });
        }


// ======================================
// SKIP WEBSITE FOR OFFLINE NON-RE
// ======================================

// const integrationResponse =
//     await payuService.updateIntegrationType(
//         merchant.payuMerchantUUID
//     );

// console.log("========== INTEGRATION TYPE RESPONSE ==========");
// console.log(JSON.stringify(integrationResponse, null, 2));

// if (!integrationResponse.success) {
//     return res.status(500).json({
//         success: false,
//         message: "Bank updated but unable to skip website step.",
//         error: integrationResponse.data
//     });
// }

        merchant.bank.accountHolderName = accountHolderName;
        merchant.bank.accountNumber = accountNumber;
        merchant.bank.ifsc = ifsc;
        merchant.bank.bankName = bankName;
        merchant.bank.branchName = branchName;

        merchant.bank.verificationStatus = "SUBMITTED";

        merchant.onboardingStep = 5;

merchant.currentSection = "bank_verification";

merchant.payuSyncAt = new Date();

        

        await merchant.save();

       return res.status(200).json({
    success: true,
    message: "Bank details submitted successfully.",
    data: {
        merchantId: merchant._id,
        onboardingStep: merchant.onboardingStep,
        currentSection: merchant.currentSection,
        bank: merchant.bank,
        payu: payuResponse.data
    }
});

    } catch (err) {

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }
};



exports.verifyBank = async (req, res) => {

    try {

        const { merchantId } = req.params;

        const merchant = await Merchant.findById(merchantId);

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: "Merchant not found"
            });
        }

        // Credentials vandha apram
        // PayU verification status parse pannuvom

        return res.status(200).json({
            success: true,
            message: "Bank verification pending."
        });

    } catch (err) {

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

};


exports.getBankStatus = async (req, res) => {

    try {

        const { merchantId } = req.params;

        const merchant = await Merchant.findById(merchantId);

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: "Merchant not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: merchant.bank
        });

    } catch (err) {

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

};




exports.testIntegrationType = async (req, res) => {
    try {

        const { merchantId } = req.params;

        const merchant = await Merchant.findById(merchantId);

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: "Merchant not found"
            });
        }

        const response =
            await payuService.updateIntegrationType(
                merchant.payuMerchantUUID
            );

        console.log(
            "========== TOOLS RESPONSE =========="
        );

        console.log(
            JSON.stringify(response, null, 2)
        );

        return res.status(200).json({
            success: response.success,
            data: response.data
        });

    } catch (err) {

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }
};

// ======================================
//  BUSINESS IN PAYU
// ======================================



exports.updateBusinessInformation = async (req, res) => {
  try {

    const { merchantId } = req.params;

   const {
  businessCategory,
  businessSubCategory,
  addressLine1,
  addressLine2,
  city,
  state,
  pincode,
  gstin,
  cin,
  llpin,
  expectedMonthlySales,

  registrationAddress,
  registrationCity,
  registrationState,
  registrationPincode
} = req.body;

    const merchant = await Merchant.findOne({
      _id: merchantId,
      assignedAgent: req.user._id
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found"
      });
    }

   merchant.businessInformation = {
      ...merchant.businessInformation,
  businessCategory,
  businessSubCategory,
  addressLine1,
  addressLine2,
  city,
  state,
  pincode,
  gstin,
  cin,
  llpin,
  expectedMonthlySales,

  registrationAddress,
  registrationCity,
  registrationState,
  registrationPincode
};

   merchant.currentSection = "signatory";
merchant.onboardingStep = 7;

console.log("========== REQUEST ==========");
console.log({
    
    businessCategory,
    businessSubCategory,
    expectedMonthlySales,
    gstin,
    cin
});

   const payuResponse = await payuService.updateBusiness(
  merchant.payuMerchantUUID,
  {
    business_category: businessCategory,
    business_sub_category: businessSubCategory,
    gstin: gstin,
    cin: cin,
    llpin: llpin,
    expected_monthly_sales: expectedMonthlySales,
  }
);

if (!payuResponse.success) {

    return res.status(500).json({
        success: false,
        message: "Unable to update Business Information in PayU.",
        error: payuResponse.data
    });

}

// ======================================
// UPDATE REGISTRATION ADDRESS IN PAYU
// ======================================

const addressResponse = await payuService.updateAddress(
  merchant.payuMerchantUUID,
  {
    registrationAddress,
    registrationCity,
    registrationState,
    registrationPincode
  }
);

if (!addressResponse.success) {
  return res.status(500).json({
    success: false,
    message: "Business saved, but unable to update Registration Address in PayU.",
    error: addressResponse.data
  });
}

merchant.payuSyncAt = new Date();

await merchant.save();



    return res.status(200).json({
    success: true,
    message: "Business Information Saved Successfully",
    data: {
        merchantId: merchant._id,
        onboardingStep: merchant.onboardingStep,
        currentSection: merchant.currentSection,
        payuStatus: merchant.payuStatus,
        businessInformation: merchant.businessInformation
    }
});

  } catch (err) {

    return res.status(500).json({
      success: false,
      message: err.message
    });

  }
};


exports.getBusinessInformation = async (req, res) => {
  try {

    const { merchantId } = req.params;

    const merchant = await Merchant.findOne({
      _id: merchantId,
      assignedAgent: req.user._id
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: merchant.businessInformation
    });

  } catch (err) {

    return res.status(500).json({
      success: false,
      message: err.message
    });

  }
};


// ======================================
// WEBSITE DETAILS
// ======================================

exports.updateWebsiteDetails = async (req, res) => {
  try {
    const { merchantId } = req.params;

    const {
      websiteUrl,
      androidUrl,
      iosUrl
    } = req.body;

    const merchant = await Merchant.findOne({
      _id: merchantId,
      assignedAgent: req.user._id
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found"
      });
    }

    // ======================================
    // OFFLINE MERCHANT - SKIP WEBSITE
    // ======================================

    if (!websiteUrl && !androidUrl && !iosUrl) {
  merchant.website = {
    websiteUrl: null,
    androidUrl: null,
    iosUrl: null,
    skipped: true
  };
      merchant.currentSection = "signatory";
      merchant.onboardingStep = 7;

      await merchant.save();

      return res.status(200).json({
        success: true,
        message: "Website step skipped successfully.",
        data: {
          merchantId: merchant._id,
          onboardingStep: merchant.onboardingStep,
          currentSection: merchant.currentSection
        }
      });
    }

    // ======================================
    // UPDATE WEBSITE IN PAYU
    // ======================================

    const payuResponse = await payuService.updateWebsite(
      merchant.payuMerchantUUID,
      {
        url: websiteUrl,
        android: androidUrl,
        ios: iosUrl
      }
    );

    console.log("========== WEBSITE PAYU RESPONSE ==========");
    console.log(JSON.stringify(payuResponse, null, 2));

    if (!payuResponse.success) {
      return res.status(500).json({
        success: false,
        message: "Unable to update website details in PayU.",
        error: payuResponse.data
      });
    }

    // ======================================
    // SAVE LOCAL DATA
    // ======================================

    merchant.website = {
  websiteUrl: websiteUrl || null,
  androidUrl: androidUrl || null,
  iosUrl: iosUrl || null,
  skipped: false
};

    merchant.currentSection = "signatory";
    merchant.onboardingStep = 7;
    merchant.payuSyncAt = new Date();

    await merchant.save();

    return res.status(200).json({
      success: true,
      message: "Website details saved successfully.",
      data: {
        merchantId: merchant._id,
        onboardingStep: merchant.onboardingStep,
        currentSection: merchant.currentSection
      }
    });

  } catch (err) {

    console.error("WEBSITE UPDATE ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};



// ======================================
// ADD SIGNATORY DETAILS
// ======================================

exports.addSignatoryDetails = async (req, res) => {
    try {

        const { merchantId } = req.params;

        const {
            name,
            email,
            panNumber
        } = req.body;

        if (!name || !email || !panNumber) {
            return res.status(400).json({
                success: false,
                message: "Name, Email and PAN Number are required"
            });
        }

        const merchant = await Merchant.findOne({
            _id: merchantId,
            assignedAgent: req.user._id
        });

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: "Merchant not found"
            });
        }

        // Save locally
        merchant.authorizedSignatory = {
            ...merchant.authorizedSignatory,
            name,
            email,
            panNumber
        };



        merchant.onboardingStep = 7;

        merchant.currentSection = "digilocker";

        merchant.payuSyncAt = new Date();

        

        const payload = {
            name,
            email,
            panNumber
        };

        // CIN only for eligible entities
        if (
            ["Private Limited", "Public Limited", "One Person Company"]
                .includes(merchant.entityType)
        ) {
            // payload.cinNumber = merchant.businessInformation?.cin || "";
        }

        const payuResponse = await payuService.addSignatoryDetails(
    merchant.payuMerchantUUID,
    payload
);

if (!payuResponse.success) {

    return res.status(500).json({
        success: false,
        message: "Unable to update signatory details.",
        error: payuResponse.data
    });

}

await merchant.save();

       return res.status(200).json({
    success: true,
    message: "Signatory details updated successfully",
    data: {
        merchantId: merchant._id,
        onboardingStep: merchant.onboardingStep,
        currentSection: merchant.currentSection,
        signatory: merchant.authorizedSignatory
    }
});

    } catch (err) {

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }
};

// ======================================
// ADD / UPDATE UBO
// ======================================

exports.addUBO = async (req, res) => {

    try {

        const { merchantId } = req.params;

        const { beneficiaries } = req.body;

        if (
            !Array.isArray(beneficiaries) ||
            beneficiaries.length === 0
        ) {
            return res.status(400).json({
                success: false,
                message: "At least one UBO is required."
            });
        }

        // PayU documentation supports maximum 4 UBOs
        if (beneficiaries.length > 4) {
            return res.status(400).json({
                success: false,
                message: "Maximum 4 UBOs can be submitted."
            });
        }

        const merchant = await Merchant.findOne({
            _id: merchantId,
            assignedAgent: req.user._id
        });

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: "Merchant not found"
            });
        }

        if (!merchant.payuMerchantUUID) {
            return res.status(400).json({
                success: false,
                message: "PayU Merchant UUID not found"
            });
        }

        // ======================================
        // ENTITY VALIDATION
        // ======================================

        const uboRequiredEntities = [
            "Partnership",
            "Pvt Ltd",
            "Public Limited",
            "LLP",
            "Trust",
            "Society"
        ];

        if (
            !uboRequiredEntities.includes(
                merchant.entityType
            )
        ) {

            return res.status(400).json({
                success: false,
                message:
                    `UBO is not required for ${merchant.entityType}.`
            });
        }

        // ======================================
        // VALIDATE UBO DATA
        // ======================================

        for (const ubo of beneficiaries) {

            if (
                !ubo.beneficiaryName ||
                !ubo.panNumber ||
                ubo.ownershipPercent === undefined ||
                !ubo.dob ||
                !ubo.nationality ||
                !ubo.address?.addressLine ||
                !ubo.address?.pincode
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Complete UBO details are required."
                });
            }
        }

        // ======================================
        // SEND TO PAYU
        // ======================================

        const payuResponse =
            await payuService.addUBO(
                merchant.payuMerchantUUID,
                beneficiaries
            );

        if (!payuResponse.success) {

            console.error(
                "PAYU UBO ERROR:",
                payuResponse.data
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to submit UBO details to PayU.",
                error: payuResponse.data
            });
        }

        // ======================================
        // SAVE LOCAL UBO
        // ======================================

        merchant.ubo = {
            required: true,
            submitted: true,
            beneficiaries: beneficiaries.map(
                (ubo, index) => ({
                    beneficiaryName:
                        ubo.beneficiaryName,

                    panNumber:
                        ubo.panNumber
                            .toUpperCase(),

                    ownershipPercent:
                        Number(
                            ubo.ownershipPercent
                        ),

                    dob: ubo.dob,

                    nationality:
                        ubo.nationality || "IN",

                    email:
                        ubo.email || null,

                    address: {
                        addressLine:
                            ubo.address.addressLine,

                        pincode:
                            ubo.address.pincode
                    },

                    // PayU response may contain UUID
                    payuUUID:
                        payuResponse
                            .data
                            ?.merchant
                            ?.ultimate_beneficiaries
                            ?.[index]
                            ?.ultimate_beneficiary_uuid ||
                        null
                })
            ),

            submittedAt: new Date()
        };

        merchant.onboardingStep = 9;

        merchant.currentSection =
            "business_members";

        merchant.payuSyncAt =
            new Date();

        await merchant.save();

        return res.status(200).json({

            success: true,

            message:
                "UBO details submitted successfully.",

            data: {
                merchantId:
                    merchant._id,

                onboardingStep:
                    merchant.onboardingStep,

                currentSection:
                    merchant.currentSection,

                ubo:
                    merchant.ubo,

                payu:
                    payuResponse.data
            }
        });

    } catch (err) {

        console.error(
            "UBO SUBMIT ERROR:",
            err
        );

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ======================================
// INITIATE DIGILOCKER
// ======================================

exports.initiateDigiLocker = async (req, res) => {

    try {

        const { merchantId } = req.params;

        const merchant = await Merchant.findOne({
            _id: merchantId,
            assignedAgent: req.user._id
        });

        if (!merchant) {

            return res.status(404).json({
                success: false,
                message: "Merchant not found"
            });

        }

        if (!merchant.payuMerchantId) {

            return res.status(400).json({
                success: false,
                message: "PayU Merchant ID not found"
            });

        }

        const payuResponse = await payuService.initiateDigiLocker(
    merchant.payuMerchantId
);

        if (!payuResponse.success) {

    return res.status(500).json({
        success: false,
        message: "Unable to generate DigiLocker link.",
        error: payuResponse.data
    });

}


merchant.digilocker = {
    status: "LINK_GENERATED",
    captureLink: payuResponse.data.capture_link || null,
    generatedAt: new Date()
};

merchant.currentSection = "digilocker";

merchant.payuSyncAt = new Date();

await merchant.save();

       return res.status(200).json({
    success: true,
    message: "DigiLocker link generated successfully.",
    data: {
        merchantId: merchant._id,
        currentSection: merchant.currentSection,
        captureLink: payuResponse.data.capture_link,
        status: payuResponse.data.status
    }
});

    } catch (err) {

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

};




// ======================================================
// UPDATE GEO LOCATION
// ======================================================

exports.updateGeoLocation = async (req, res) => {

    try {

        const merchant = await Merchant.findById(req.params.id);

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: "Merchant not found"
            });
        }

        if (!merchant.payuMerchantUUID) {
            return res.status(400).json({
                success: false,
                message: "PayU Merchant UUID not found"
            });
        }

        const payuResponse = await payuService.updateGeoLocation(
    merchant.payuMerchantUUID,
    req.body
);

if (!payuResponse.success) {

    return res.status(500).json({
        success: false,
        message: "Unable to update Geo Location.",
        error: payuResponse.data
    });

}

merchant.geoLocation = {
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    updatedAt: new Date()
};

merchant.currentSection = "geo_location";

merchant.onboardingStep = 8;

merchant.payuSyncAt = new Date();

await merchant.save();

       return res.status(200).json({
    success: true,
    message: "Geo Location Updated Successfully",
    data: {
        merchantId: merchant._id,
        onboardingStep: merchant.onboardingStep,
        currentSection: merchant.currentSection,
        geoLocation: merchant.geoLocation
    }
});

    } catch (error) {

        console.error("Update Geo Location Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};


// ======================================================
// SHOP VERIFICATION
// ======================================================

exports.shopVerification = async (req, res) => {

    try {

        const merchant = await Merchant.findOne({
    _id: req.params.merchantId,
    assignedAgent: req.user._id,
});

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: "Merchant not found"
            });
        }


        // ==========================================
        // CHECK PAYU MERCHANT UUID
        // ==========================================

        if (!merchant.payuMerchantUUID) {
            return res.status(400).json({
                success: false,
                message: "PayU Merchant UUID not found"
            });
        }


        // ==========================================
        // CHECK LOCATION
        // ==========================================

        const {
            latitude,
            longitude
        } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: "Latitude and longitude are required"
            });
        }


        // ==========================================
        // CHECK SHOP PHOTOS
        // ==========================================

        if (!req.files) {
            return res.status(400).json({
                success: false,
                message: "Shop photos are required"
            });
        }


        const requiredPhotos = [
            "bannerPhoto",
            "insidePhoto",
            "fullShopPhoto",
            "businessPhoto"
        ];

        for (const photo of requiredPhotos) {

            if (
                !req.files[photo] ||
                !req.files[photo][0]
            ) {
                return res.status(400).json({
                    success: false,
                    message: `${photo} is required`
                });
            }

        }


        // ==========================================
        // STEP 1
        // UPDATE GEO LOCATION IN PAYU
        // ==========================================

        const geoResponse =
            await payuService.updateGeoLocation(
                merchant.payuMerchantUUID,
                {
                    latitude,
                    longitude
                }
            );


        if (!geoResponse.success) {

            return res.status(500).json({
                success: false,
                message: "Unable to update Geo Location in PayU.",
                error: geoResponse.data
            });

        }


        // ==========================================
        // TEMPORARY SUCCESS
        // ==========================================

       // ==========================================
// STEP 2
// UPLOAD SHOP PHOTOS / CPV TO PAYU
// ==========================================

if (!merchant.payuMerchantId) {
    return res.status(400).json({
        success: false,
        message: "PayU Merchant ID not found"
    });
}

// ==========================================
// FETCH PAYU REQUIRED DOCUMENTS
// ==========================================

const requiredDocsResponse =
    await payuService.getRequiredDocuments(
        merchant.payuMerchantId
    );

console.log(
    "========== PAYU REQUIRED DOCUMENTS =========="
);

console.log(
    JSON.stringify(
        requiredDocsResponse,
        null,
        2
    )
);

console.log(
    "============================================="
);

const shopPhotos = [
    req.files.bannerPhoto[0],
    req.files.insidePhoto[0],
    req.files.fullShopPhoto[0],
    req.files.businessPhoto[0]
];

const uploadedPhotos = [];

for (const photo of shopPhotos) {

    console.log(
        "Uploading CPV Photo:",
        photo.originalname
    );

    const cpvResponse =
        await payuService.uploadCPVDocument(
            merchant.payuMerchantId,
            photo.path
        );

    if (!cpvResponse.success) {

        return res.status(500).json({
            success: false,
            message: `Unable to upload ${photo.originalname} to PayU`,
            error: cpvResponse.data
        });

    }

    uploadedPhotos.push({
        fileName: photo.originalname,
        path: photo.path
    });
}


// ==========================================
// SAVE SHOP VERIFICATION LOCALLY
// ==========================================

merchant.geoLocation = {
    latitude,
    longitude,
    updatedAt: new Date()
};

merchant.shopVerification = {
    status: "COMPLETED",

    photos: uploadedPhotos,

    latitude,
    longitude,

    verifiedAt: new Date()
};

merchant.currentSection = "shop_verification";

merchant.payuSyncAt = new Date();

await merchant.save();


// ==========================================
// SUCCESS
// ==========================================

return res.status(200).json({
    success: true,
    message: "Shop Verification completed successfully",
    data: {
        merchantId: merchant._id,
        geoLocation: merchant.geoLocation,
        shopVerification: merchant.shopVerification
    }
});


    } catch (error) {

        console.error(
            "Shop Verification Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};


// ======================================================
// CREATE VKYC PROFILE
// ======================================================

exports.createVKYCProfile = async (req, res) => {

    try {

        const merchant = await Merchant.findById(req.params.id);

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: "Merchant not found"
            });
        }

        if (!merchant.payuMerchantId) {
            return res.status(400).json({
                success: false,
                message: "PayU Merchant ID not found"
            });
        }

      const payuResponse = await payuService.createVKYCProfile(
    merchant.payuMerchantId
);

    if (!payuResponse.success) {

    return res.status(500).json({
        success: false,
        message: "Unable to create VKYC Profile.",
        error: payuResponse.data
    });

}

const captureLink =
    payuResponse.data?.capture_link || null;


merchant.vkyc = {

    status: captureLink
        ? "LINK_GENERATED"
        : "PROFILE_CREATED",

    captureLink: captureLink,

    profileCreatedAt:
        new Date(),

    linkCreatedAt:
        captureLink
            ? new Date()
            : null
};


merchant.onboardingStep = 11;

merchant.currentSection = "vkyc";

merchant.payuSyncAt =
    new Date();

await merchant.save();

        return res.status(200).json({
    success: true,
    message: "VKYC Profile Created Successfully",
    data: {
        merchantId: merchant._id,
        onboardingStep: merchant.onboardingStep,
        currentSection: merchant.currentSection,
        vkyc: merchant.vkyc,
        payuResponse: payuResponse.data
    }
});

    } catch (error) {

        console.error("Create VKYC Profile Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};



// ======================================================
// FETCH REQUIRED DOCUMENTS
// ======================================================

exports.getRequiredDocuments = async (req, res) => {

    try {

      
      console.log("Params:", req.params);

const merchant = await Merchant.findById(req.params.merchantId);

console.log("Merchant:", merchant);

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: "Merchant not found"
            });
        }

        if (!merchant.payuMerchantId) {
            return res.status(400).json({
                success: false,
                message: "PayU Merchant ID not found"
            });
        }

        const payuResponse = await payuService.getRequiredDocuments(
    merchant.payuMerchantId
);


if (!payuResponse.success) {

    return res.status(500).json({
        success: false,
        message: "Unable to fetch required documents.",
        error: payuResponse.data
    });

}

console.log(
    JSON.stringify(payuResponse.data, null, 2)
);

       return res.status(200).json({
    success: true,
    message: "Required documents fetched successfully",
    data: payuResponse.data
});

    } catch (error) {

        console.error("Required Documents Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};


// ======================================================
// UPLOAD KYC DOCUMENT
// ======================================================
// ======================================================
// UPLOAD KYC DOCUMENT
// ======================================================

exports.uploadKYCDocument = async (req, res) => {

    try {

        const merchant = await Merchant.findById(
            req.params.merchantId
        );

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: "Merchant not found"
            });
        }

        if (!merchant.payuMerchantId) {
            return res.status(400).json({
                success: false,
                message: "PayU Merchant ID not found"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Document is required"
            });
        }


        // ======================================
        // DOCUMENT DETAILS
        // ======================================

        console.log(req.file);

        console.log(
            "Document Category:",
            req.body.documentCategory
        );

        console.log(
            "Document Type:",
            req.body.documentType
        );

        console.log(
            "File Path:",
            req.file.path
        );

        console.log(req.body);


        // ======================================
// CHECK REQUIRED DOCS BEFORE UPLOAD
// ======================================

const requiredDocsBeforeUpload =
    await payuService.getRequiredDocuments(
        merchant.payuMerchantId
    );

console.log(
    "========== REQUIRED DOCS BEFORE UPLOAD =========="
);

console.log(
    JSON.stringify(
        requiredDocsBeforeUpload.data,
        null,
        2
    )
);

console.log(
    "================================================="
);

// ======================================
// UPLOAD DOCUMENT TO PAYU
// ======================================

const payuResponse =
    await payuService.uploadKYCDocument(
        merchant.payuMerchantId,
        {
            documentCategory:
                req.body.documentCategory,

            documentType:
                req.body.documentType,

            filePath:
                req.file.path
        }
    );
        
      


        if (!payuResponse.success) {

            return res.status(500).json({
                success: false,
                message:
                    "Unable to upload document.",
                error:
                    payuResponse.data
            });

        }


        // ======================================
        // FETCH REQUIRED DOCUMENTS FROM PAYU
        // ======================================

        const requiredDocsResponse =
            await payuService.getRequiredDocuments(
                merchant.payuMerchantId
            );


        if (!requiredDocsResponse.success) {

            return res.status(500).json({
                success: false,
                message:
                    "Document uploaded, but unable to check required documents.",
                error:
                    requiredDocsResponse.data
            });

        }


        const categories =
            requiredDocsResponse.data
                ?.document_categories || [];


        // ======================================
        // GET ONLY REQUIRED CATEGORIES
        // ======================================

        const requiredCategories =
            categories.filter(
                (category) =>
                    category.kyc_document_status ===
                    "required"
            );


        // ======================================
        // CHECK SUBMITTED DOCUMENTS
        // ======================================

        const submittedCategories =
            requiredCategories.filter(
                (category) =>
                    category.kyc_document?.status ===
                    "DOCUMENT_SUBMITTED"
            );


        // ======================================
        // CHECK ALL REQUIRED DOCUMENTS
        // ======================================

        const allDocumentsSubmitted =
            requiredCategories.length > 0 &&
            submittedCategories.length ===
                requiredCategories.length;


        // ======================================
        // DEBUG
        // ======================================

        console.log(
            "========== DOCUMENT CHECK =========="
        );

        console.log(
            "Required Categories:",
            requiredCategories.map(
                (category) =>
                    category.name
            )
        );

        console.log(
            "Submitted Categories:",
            submittedCategories.map(
                (category) =>
                    category.name
            )
        );

        console.log(
            "All Documents Submitted:",
            allDocumentsSubmitted
        );


        // ======================================
        // UPDATE MERCHANT STATUS
        // ======================================

        merchant.payuSyncAt =
            new Date();


        if (allDocumentsSubmitted) {

            // ALL REQUIRED DOCUMENTS COMPLETED

            merchant.documentVerified =
                true;

            merchant.currentSection =
                "vkyc";

            merchant.onboardingStep =
                11;

        } else {

            // DOCUMENTS STILL PENDING

            merchant.documentVerified =
                false;

            merchant.currentSection =
                "documents";

            merchant.onboardingStep =
                10;
        }


        await merchant.save();


        // ======================================
        // RESPONSE
        // ======================================

        return res.status(200).json({

            success: true,

            message:
                "Document uploaded successfully.",

            data: {

                merchantId:
                    merchant._id,

                onboardingStep:
                    merchant.onboardingStep,

                currentSection:
                    merchant.currentSection,

                documentVerified:
                    merchant.documentVerified,

                allDocumentsSubmitted:
                    allDocumentsSubmitted,

                requiredDocuments:
                    requiredCategories.map(
                        (category) =>
                            category.name
                    ),

                submittedDocuments:
                    submittedCategories.map(
                        (category) =>
                            category.name
                    ),

                payuResponse:
                    payuResponse.data
            }

        });


    } catch (error) {

        console.error(
            "KYC DOCUMENT UPLOAD ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};


// ─── Submit Merchant ───────────────────────────────────────────────────────
exports.submitMerchant = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({
  _id: merchantId,
  assignedAgent: req.user._id,
});
    if (!merchant) return res.status(404).json({ success: false, message: 'Merchant not found' });
    if (merchant.status !== 'draft') return res.status(400).json({ success: false, message: 'Only draft merchants can be submitted' });

    const docs = await MerchantDocument.findOne({ merchant: merchant._id });
    if (!docs) return res.status(400).json({ success: false, message: 'Please upload documents before submitting' });

    merchant.status = 'submitted';
    merchant.statusTimeline.push({ status: 'submitted', updatedBy: req.user._id, updatedByRole: 'agent' });
    await merchant.save();

    // Notify all admins
    const admins = await Admin.find({ isActive: true });
    for (const admin of admins) {
      await sendNotification({ recipient: admin._id, recipientRole: 'admin', type: NOTIFICATION_TYPES.NEW_MERCHANT_SUBMISSION, title: 'New Merchant Submitted', message: `${merchant.merchantName} submitted by Agent`, relatedEntity: merchant._id, relatedEntityType: 'Merchant' });
    }

    res.json({ success: true, data: merchant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get Agent's Merchants ─────────────────────────────────────────────────
exports.getMyMerchants = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const query = { assignedAgent: req.user._id };
    if (status) query.status = status;
    if (search) query.$or = [
      { merchantName: new RegExp(search, 'i') },
      { shopName: new RegExp(search, 'i') },
      { mobile: new RegExp(search, 'i') },
    ];

    const total = await Merchant.countDocuments(query);
    const merchants = await Merchant.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: merchants, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get Agent Dashboard Stats ─────────────────────────────────────────────
exports.getAgentStats = async (req, res) => {
  try {
    const agentId = req.user._id;
    const [total, pending, approved, active, rejected, commissionEligible] = await Promise.all([
      Merchant.countDocuments({ assignedAgent: agentId }),
      Merchant.countDocuments({ assignedAgent: agentId, status: { $in: ['submitted', 'under_review'] } }),
      Merchant.countDocuments({ assignedAgent: agentId, status: 'approved' }),
      Merchant.countDocuments({ assignedAgent: agentId, status: 'active' }),
      Merchant.countDocuments({ assignedAgent: agentId, status: 'rejected' }),
      Merchant.countDocuments({ assignedAgent: agentId, commissionEligible: true }),
    ]);
    res.json({ success: true, data: { total, pending, approved, active, rejected, commissionEligible } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get Single Merchant ───────────────────────────────────────────────────
exports.getMerchant = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.params.merchantId)
      .populate('assignedAgent', 'fullName email mobile')
      .populate('qrCode');

    if (!merchant) return res.status(404).json({ success: false, message: 'Merchant not found' });

    // Agents can only see their own
    if (req.user.role === 'agent' && merchant.assignedAgent._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: merchant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Update Merchant (Draft only) ─────────────────────────────────────────
exports.updateMerchant = async (req, res) => {
  try {
    const { merchantName, mobile, email, shopName, businessCategory, address, aadhaarNumber, panNumber } = req.body;
    const merchant = await Merchant.findOne({ _id: req.params.id, assignedAgent: req.user._id, status: 'draft' });
    if (!merchant) return res.status(404).json({ success: false, message: 'Merchant not found or cannot be edited' });

    const dupError = await checkDuplicate(mobile, aadhaarNumber, panNumber, merchant._id);
    if (dupError) return res.status(409).json({ success: false, message: dupError });

    Object.assign(merchant, { merchantName, mobile, email, shopName, businessCategory, address, aadhaarNumber, panNumber });
    await merchant.save();

    await createAuditLog({ userId: req.user._id, userRole: 'agent', action: 'MERCHANT_UPDATES', entityType: 'Merchant', entityId: merchant._id, req });
    res.json({ success: true, data: merchant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ─── Get My Invoices ─────────────────────────────────────────────

exports.getMyInvoices = async (req, res) => {

  try {

    const invoices = await Invoice.find({
      agent: req.user._id
    }).sort({
      createdAt: -1
    });

    res.json({
      success: true,
      data: invoices
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};


exports.checkPanStatus = async (req, res) => {
    try {
        const { merchantId } = req.params;

        const merchant = await Merchant.findById(merchantId);

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: "Merchant not found",
            });
        }

        const payuResponse = await payuService.getMerchant(
            merchant.payuMerchantUUID
        );

        if (!payuResponse.success) {
            return res.status(500).json({
                success: false,
                message: "Unable to fetch merchant from PayU",
                error: payuResponse.data,
            });
        }

        // Next step-la verification status parse pannuvom

        return res.status(200).json({
            success: true,
            data: payuResponse.data,
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};



// ======================================
// DIGILOCKER STATUS
// ======================================

exports.checkDigiLockerStatus = async (req, res) => {
    try {

        const { merchantId } = req.params;

        const merchant = await Merchant.findOne({
            _id: merchantId,
            assignedAgent: req.user._id
        });

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: "Merchant not found"
            });
        }

        if (!merchant.payuMerchantUUID) {
            return res.status(400).json({
                success: false,
                message: "PayU Merchant UUID not found"
            });
        }

        const payuResponse = await payuService.getMerchant(
            merchant.payuMerchantUUID
        );

        if (!payuResponse.success) {
            return res.status(500).json({
                success: false,
                message: "Unable to fetch DigiLocker status from PayU.",
                error: payuResponse.data
            });
        }

        const payuMerchant =
            payuResponse.data?.merchant || {};

        const digiLockerStatus =
            payuMerchant.digilocker_status;

        console.log(
            "========== DIGILOCKER STATUS =========="
        );

        console.log(
            "PayU DigiLocker Status:",
            digiLockerStatus
        );

        // ======================================
        // VERIFIED / APPROVED
        // ======================================

        if (
            digiLockerStatus &&
            digiLockerStatus.toLowerCase() === "approved"
        ) {

            merchant.digilocker.status = "VERIFIED";
            merchant.digilocker.verifiedAt = new Date();

            merchant.authorizedSignatory.digilockerVerified = true;

            merchant.payuSyncAt = new Date();

            await merchant.save();

            return res.status(200).json({
                success: true,
                verified: true,
                status: "VERIFIED",
                message: "DigiLocker verification completed successfully."
            });
        }

        // ======================================
        // NOT VERIFIED YET
        // ======================================

        return res.status(200).json({
            success: true,
            verified: false,
            status: digiLockerStatus || "PENDING",
            message: "DigiLocker verification is not completed yet."
        });

    } catch (err) {

        console.error(
            "DIGILOCKER STATUS ERROR:",
            err
        );

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


// ======================================================
// GENERATE AGREEMENT
// ======================================================

exports.generateAgreement = async (req, res) => {

    try {

        const { merchantId } = req.params;

        const merchant = await Merchant.findOne({
            _id: merchantId,
            assignedAgent: req.user._id
        });

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: "Merchant not found"
            });
        }

        if (!merchant.payuMerchantUUID) {
            return res.status(400).json({
                success: false,
                message: "PayU Merchant UUID not found"
            });
        }

        console.log("========== GENERATE AGREEMENT ==========");
        console.log("Mongo Merchant ID:", merchant._id);
        console.log("PayU Merchant UUID:", merchant.payuMerchantUUID);
        console.log("========================================");

        const payuResponse =
            await payuService.generateAgreement(
                merchant.payuMerchantUUID
            );

        if (!payuResponse.success) {

            return res.status(500).json({
                success: false,
                message: "Unable to generate agreement",
                error: payuResponse.data
            });

        }

        return res.status(200).json({
            success: true,
            message: "Agreement generated successfully",
            data: payuResponse.data
        });

    } catch (error) {

        console.error("Generate Agreement Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};