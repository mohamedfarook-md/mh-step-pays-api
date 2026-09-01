const mongoose = require('mongoose');

const merchantSchema = new mongoose.Schema({
  // Basic Info
  merchantName: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, unique: true },
  email: { type: String, lowercase: true },
  shopName: { type: String, required: true },
  entityType: {
  type: String,
  required: true,
  enum: [
    "Individual",
    "Sole Proprietorship",
    "Partnership",
    "LLP",
    "Private Limited",
    "Public Limited",
    "Trust",
    "Society",
    "HUF"
  ]
},

merchantType: {
  type: String,
  default: null,
},

businessSubCategory: {
  type: String,
  default: null,
},

tradeName: {
  type: String,
  default: null,
},

 businessCategory: {
  type: String,
  default: null,
},
 
address: {
  type: String,
  required: true,
},

  // KYC Fields (stored as encrypted references)
  aadhaarNumber: { type: String },
  panNumber: { type: String },
 panVerified: {
  type: Boolean,
  default: false
},

bankVerified: {
  type: Boolean,
  default: false
},

ckycVerified: {
  type: Boolean,
  default: false
},

agreementAccepted: {
  type: Boolean,
  default: false
},
  // Assigned Agent
  assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'FieldAgent', required: true },

  // Status Workflow
  status: {
    type: String,
    enum: [
      'draft', 'submitted', 'under_review', 'approved',
      'qr_uploaded', 'qr_deployed', 'transaction_verified',
      '7day_validation', 'active', 'commission_eligible',
      'completed', 'rejected'
    ],
    default: 'draft',
  },

  onboardingStep: {
  type: Number,
  default: 1,
},

  rejectionReason: { type: String },

  // Status Timeline
  statusTimeline: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId },
    updatedByRole: { type: String },
    note: String,
  }],

  // QR Info
  qrCode: { type: mongoose.Schema.Types.ObjectId, ref: 'QRCode' },

  // Transaction Tracking
  firstTransactionDate: { type: Date },
  transactionCount: { type: Number, default: 0 },
  transactionVerified: { type: Boolean, default: false },

  // Activation
  activationDate: { type: Date },
  validationStartDate: { type: Date },
  validationEndDate: { type: Date },

  // Commission
  commissionEligible: { type: Boolean, default: false },
  commissionEligibleDate: { type: Date },

  // Admin
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  approvedAt: { type: Date },

  // ===============================
// PAYU DETAILS
// ===============================
payuMerchantId: {
  type: String,
  default: null,
},

payuMerchantUUID: {
  type: String,
  default: null,
},

payuProductUUID: {
  type: String,
  default: null,
},

payuStatus: {
  type: String,
  enum: [
    "NOT_CREATED",
    "CREATED",
    "PENDING",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED"
  ],
  default: "NOT_CREATED",
},

payuSyncAt: {
  type: Date,
},

// ===============================
// ADMIN SUBMISSION
// ===============================
submittedToAdmin: {
  type: Boolean,
  default: false,
},

submittedToAdminAt: {
  type: Date,
},

submittedToPayU: {
  type: Boolean,
  default: false,
},

submittedToPayUAt: {
  type: Date,
},

// ===============================
// DOCUMENT VERIFICATION
// ===============================
documentVerified: {
  type: Boolean,
  default: false,
},

basicDetailsCompleted: {
  type: Boolean,
  default: false,
},

currentSection: {
  type: String,
  default: "basic_details",
},

documentPdf: {
  type: String,
  default: null,
},

dob: {
    type: String,
    default: null,
},


// ===============================
// CKYC
// ===============================
ckyc: {
  status: {
    type: String,
    enum: [
      "PENDING",
      "INITIATED",
      "SKIPPED",
      "VERIFIED",
      "FAILED"
    ],
    default: "PENDING",
  },

  referenceId: {
    type: String,
    default: null,
  },

  transactionId: {
    type: String,
    default: null,
  },

  verifiedAt: {
    type: Date,
    default: null,
  }
},




// ===============================
// BANK DETAILS
// ===============================
bank: {
  accountHolderName: {
    type: String,
    default: null,
  },

  accountNumber: {
    type: String,
    default: null,
  },

  ifsc: {
    type: String,
    default: null,
  },

  bankName: {
    type: String,
    default: null,
  },

  branchName: {
    type: String,
    default: null,
  },

  verificationStatus: {
    type: String,
    enum: [
      "PENDING",
      "SUBMITTED",
      "VERIFIED",
      "FAILED"
    ],
    default: "PENDING",
  },

  verifiedAt: {
    type: Date,
    default: null,
  }
},




// ======================================
// UBO - ULTIMATE BENEFICIAL OWNERS
// ======================================

ubo: {
  required: {
    type: Boolean,
    default: false,
  },

  submitted: {
    type: Boolean,
    default: false,
  },

  beneficiaries: [
    {
      beneficiaryName: {
        type: String,
        default: null,
      },

      panNumber: {
        type: String,
        default: null,
      },

      ownershipPercent: {
        type: Number,
        default: null,
      },

      dob: {
        type: Date,
        default: null,
      },

      nationality: {
        type: String,
        default: "IN",
      },

      email: {
        type: String,
        default: null,
      },

      address: {
        addressLine: {
          type: String,
          default: null,
        },

        pincode: {
          type: String,
          default: null,
        },
      },

      payuUUID: {
        type: String,
        default: null,
      },
    },
  ],

  submittedAt: {
    type: Date,
    default: null,
  },
},

// ======================================
// AUTHORIZED SIGNATORY
// ======================================

authorizedSignatory: {

    name: {
        type: String,
        default: null,
    },

    email: {
        type: String,
        default: null,
    },

    panNumber: {
        type: String,
        default: null,
    },

    contactDetailType: {
        type: String,
        default: "Signing Authority",
    },

    authorisedSignatory: {
        type: Boolean,
        default: true,
    },

    panVerified: {
        type: Boolean,
        default: false,
    },

    digilockerVerified: {
        type: Boolean,
        default: false,
    },

    aadhaarVerified: {
        type: Boolean,
        default: false,
    },

    verifiedAt: {
        type: Date,
        default: null,
    }

},


// ======================================
// DIGILOCKER
// ======================================

digilocker: {

    status: {
        type: String,
        default: "NOT_STARTED",
    },

    captureLink: {
        type: String,
        default: null,
    },

    generatedAt: {
        type: Date,
        default: null,
    },

    verifiedAt: {
        type: Date,
        default: null,
    }

},



// ======================================
// VKYC
// ======================================

vkyc: {

    status: {
        type: String,
        default: "NOT_STARTED",
    },

    profileCreatedAt: {
        type: Date,
        default: null,
    },

    captureLink: {
        type: String,
        default: null,
    },

    completedAt: {
        type: Date,
        default: null,
    }

},
// ======================================
// GEO LOCATION
// ======================================

geoLocation: {

    latitude: {
        type: Number,
        default: null,
    },

    longitude: {
        type: Number,
        default: null,
    },

    updatedAt: {
        type: Date,
        default: null,
    }

},


// ======================================
// SHOP VERIFICATION
// ======================================

shopVerification: {

    status: {
        type: String,
        enum: [
            "NOT_STARTED",
            "COMPLETED",
            "FAILED"
        ],
        default: "NOT_STARTED",
    },

    photos: [{
        fileName: {
            type: String,
        },

        path: {
            type: String,
        },
    }],

    latitude: {
        type: Number,
        default: null,
    },

    longitude: {
        type: Number,
        default: null,
    },

    verifiedAt: {
        type: Date,
        default: null,
    },

},


}, { timestamps: true });





// Indexes for duplicate prevention
merchantSchema.index({ mobile: 1 }, { unique: true });
merchantSchema.index({ aadhaarNumber: 1 }, { sparse: true });
merchantSchema.index({ panNumber: 1 }, { sparse: true });
merchantSchema.index({ payuMerchantUUID: 1 }, { sparse: true });
merchantSchema.index({ payuMerchantId: 1 }, { sparse: true });

module.exports = mongoose.model('Merchant', merchantSchema);