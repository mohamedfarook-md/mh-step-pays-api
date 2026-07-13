const { sendNotification } = require("../utils/tonetag");

exports.webhook = async (req, res) => {
  try {
    console.log("========== EASEBUZZ WEBHOOK ==========");
    console.log(req.body);
    console.log("=====================================");

    // Always return 200 to Easebuzz
    return res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    return res.status(500).send("ERROR");
  }
};