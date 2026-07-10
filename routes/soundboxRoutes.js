const express = require("express");
const router = express.Router();

const {
  createSoundbox,
  getAllSoundboxes,
  getSoundbox,
  updateSoundbox,
  deleteSoundbox,
  activateSoundbox,
  deactivateSoundbox
} = require("../controllers/soundboxController");

const { protect, adminOnly } = require("../middleware/auth");

// All routes require Admin Login
router.use(protect);
router.use(adminOnly);

// Dashboard
router.get("/", getAllSoundboxes);

// Create
router.post("/", createSoundbox);

// Single
router.get("/:id", getSoundbox);

// Update
router.put("/:id", updateSoundbox);

// Delete
router.delete("/:id", deleteSoundbox);

// Activate
router.put("/:id/activate", activateSoundbox);

// Deactivate
router.put("/:id/deactivate", deactivateSoundbox);

module.exports = router;