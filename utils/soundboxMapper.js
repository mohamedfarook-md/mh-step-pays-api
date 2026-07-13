const { Soundbox } = require("../models");

/**
 * Find Soundbox using Merchant Identifier
 */
const findByMerchantIdentifier = async (merchantIdentifier) => {
  if (!merchantIdentifier) {
    throw new Error("Merchant Identifier is required.");
  }

  const soundbox = await Soundbox.findOne({
    merchantIdentifier: merchantIdentifier.trim()
  });

  if (!soundbox) {
    throw new Error("No Soundbox mapped with this Merchant Identifier.");
  }

  return soundbox;
};

/**
 * Find ToneTag TID using Merchant Identifier
 */
const findTid = async (merchantIdentifier) => {
  const soundbox = await findByMerchantIdentifier(merchantIdentifier);

  return soundbox.tid;
};

/**
 * Check if Soundbox is Active
 */
const isActive = async (merchantIdentifier) => {
  const soundbox = await findByMerchantIdentifier(merchantIdentifier);

  return soundbox.status === "Active";
};

module.exports = {
  findByMerchantIdentifier,
  findTid,
  isActive
};