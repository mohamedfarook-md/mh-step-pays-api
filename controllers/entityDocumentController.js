const entityDocuments = require("../config/entityDocuments");

const getEntityDocuments = async (req, res) => {
  try {
    const { entityType } = req.params;

    const documents = entityDocuments[entityType];

    if (!documents) {
      return res.status(404).json({
        success: false,
        message: "Invalid entity type"
      });
    }

    return res.status(200).json({
      success: true,
      entityType,
      requiredDocuments: documents.requiredDocuments
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

module.exports = {
  getEntityDocuments
};