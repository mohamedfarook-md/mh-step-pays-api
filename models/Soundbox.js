const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    txnId: String,
    amount: Number,
    utr: String,
    status: String,
    transactionTime: Date
  },
  { _id: false }
);

const soundboxSchema = new mongoose.Schema(
  {
    // Merchant Details
    merchantName: {
      type: String,
      required: true
    },

    mobile: {
      type: String,
      required: true
    },

    email: {
      type: String,
      default: ""
    },

    shopName: {
      type: String,
      required: true
    },

    shopAddress: {
      type: String,
      required: true
    },

    upiId: {
      type: String,
      required: true
    },

    // Payment Provider Details
provider: {
  type: String,
  required: true,
  trim: true
},

merchantIdentifier: {
  type: String,
  required: true,
  unique: true,
  trim: true
},

providerMerchantId: {
  type: String,
  default: "",
  trim: true
},

providerQrId: {
  type: String,
  default: "",
  trim: true
},

    // Soundbox Details
    tid: {
      type: String,
      required: true,
      unique: true
    },

    imei: {
      type: String,
      required: true,
      unique: true
    },

    barcode: {
      type: String,
      required: true,
      unique: true
    },

    // Device Status
    status: {
      type: String,
      enum: ["Pending", "Active", "Inactive"],
      default: "Pending"
    },

    activatedAt: Date,

    // Transaction History
    transactions: [transactionSchema],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin"
    }

  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Soundbox", soundboxSchema);