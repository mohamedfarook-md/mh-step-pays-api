const { Soundbox } = require("../models");
const { sendNotification } = require("../utils/tonetag");
// Create Soundbox
exports.createSoundbox = async (req, res) => {
  try {

    const exists = await Soundbox.findOne({
  $or: [
    { tid: req.body.tid },
    { imei: req.body.imei },
    { barcode: req.body.barcode }
  ]
});

if (exists) {
  return res.status(400).json({
    success: false,
    message: "Soundbox already exists."
  });
}

    const soundbox = await Soundbox.create({
      ...req.body,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: "Soundbox added successfully",
      data: soundbox
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

// Get All Soundboxes
exports.getAllSoundboxes = async (req, res) => {
  try {

  const soundboxes = await Soundbox.find()
  .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: soundboxes
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

// Get Single Soundbox
exports.getSoundbox = async (req, res) => {
  try {

   const soundbox = await Soundbox.findById(req.params.id);

    if (!soundbox) {
      return res.status(404).json({
        success: false,
        message: "Soundbox not found"
      });
    }

    res.json({
      success: true,
      data: soundbox
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

// Update Soundbox
exports.updateSoundbox = async (req, res) => {
  try {

   const exists = await Soundbox.findOne({
  _id: { $ne: req.params.id },
  $or: [
    { tid: req.body.tid },
    { imei: req.body.imei },
    { barcode: req.body.barcode }
  ]
});

if (exists) {
  return res.status(400).json({
    success: false,
    message: "TID / IMEI / Barcode already exists."
  });
}

const soundbox = await Soundbox.findByIdAndUpdate(
  req.params.id,
  req.body,
  { new: true }
);

    res.json({
      success: true,
      message: "Soundbox updated successfully",
      data: soundbox
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

// Delete Soundbox
exports.deleteSoundbox = async (req, res) => {
  try {

    await Soundbox.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Soundbox deleted successfully"
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

// Activate Soundbox
exports.activateSoundbox = async (req, res) => {
  try {

    const soundbox = await Soundbox.findById(req.params.id);

    if (!soundbox) {
      return res.status(404).json({
        success: false,
        message: "Soundbox not found"
      });
    }

    soundbox.status = "Active";
soundbox.activatedAt = new Date();

// TODO:
// ToneTag Token Generate
// ToneTag Activate API Call
    await sendNotification({
  amount: "1.00",
  tid: soundbox.tid,
  status: 2,
  txnType: 1,
  reference: `TEST${Date.now()}`
});

    await soundbox.save();

    res.json({
      success: true,
      message: "Soundbox activated successfully",
      data: soundbox
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

// Deactivate Soundbox
exports.deactivateSoundbox = async (req, res) => {
  try {

    const soundbox = await Soundbox.findById(req.params.id);

    if (!soundbox) {
      return res.status(404).json({
        success: false,
        message: "Soundbox not found"
      });
    }

    soundbox.status = "Inactive";

    await soundbox.save();

    res.json({
      success: true,
      message: "Soundbox deactivated successfully",
      data: soundbox
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};