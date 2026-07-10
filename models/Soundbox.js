const mongoose = require("mongoose");

const soundboxSchema = new mongoose.Schema(
  {
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true
    },

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

    serialNumber: {
      type: String,
      required: true,
      unique: true
    },

    bic: {
      type: String,
      required: true
    },

    clientId: {
      type: String,
      required: true
    },

    clientSecret: {
      type: String,
      required: true
    },

    apiKey: {
      type: String,
      required: true
    },

    encryptionKey: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: ["Pending", "Active", "Inactive"],
      default: "Pending"
    },

    activatedAt: Date,

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