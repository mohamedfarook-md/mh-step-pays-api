const express = require("express");
const router = express.Router();

const {
  getEntityDocuments
} = require("../controllers/entityDocumentController");

router.get("/:entityType", getEntityDocuments);

module.exports = router;