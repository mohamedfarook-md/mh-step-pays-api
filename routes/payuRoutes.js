const express = require("express");
const router = express.Router();

const payuService = require("../services/payuService");

router.get("/token", async (req, res) => {
    try {

        const token = await payuService.getAccessToken();

        return res.status(200).json({
            success: true,
            token
        });

    } catch (err) {

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }
});

module.exports = router;