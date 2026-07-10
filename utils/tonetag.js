const axios = require("axios");
const crypto = require("crypto");
const qs = require("qs");

/*
=========================================
ToneTag Encryption Helpers
=========================================
*/

function getAlgorithm(keyBase64) {

    const key = Buffer.from(keyBase64, "base64");

    switch (key.length) {

        case 16:
            return "aes-128-cbc";

        case 32:
            return "aes-256-ecb";

        default:
            throw new Error("Invalid key length : " + key.length);

    }

}

function getSHA256Hash(input) {

    const hash = crypto
        .createHash("sha256")
        .update(input)
        .digest();

    return Buffer.from(hash).toString("base64");

}

function encryptPayload(payload) {

    const keyBase64 = getSHA256Hash(
        process.env.TONETAG_ENCRYPTION_KEY
    );

    const algorithm = getAlgorithm(keyBase64);

    const key = Buffer.from(keyBase64, "base64");

    let cipher;

    if (algorithm === "aes-256-ecb") {

        cipher = crypto.createCipheriv(
            algorithm,
            key,
            null
        );

    } else {

        cipher = crypto.createCipheriv(
            algorithm,
            key,
            Buffer.alloc(16)
        );

    }

    let encrypted = cipher.update(
        JSON.stringify(payload),
        "utf8",
        "base64"
    );

    encrypted += cipher.final("base64");

    return encrypted;

}

function decryptPayload(cipherText) {

    const keyBase64 = getSHA256Hash(
        process.env.TONETAG_ENCRYPTION_KEY
    );

    const algorithm = getAlgorithm(keyBase64);

    const key = Buffer.from(keyBase64, "base64");

    let decipher;

    if (algorithm === "aes-256-ecb") {

        decipher = crypto.createDecipheriv(
            algorithm,
            key,
            null
        );

    } else {

        decipher = crypto.createDecipheriv(
            algorithm,
            key,
            Buffer.alloc(16)
        );

    }

    let decrypted = decipher.update(
        cipherText,
        "base64",
        "utf8"
    );

    decrypted += decipher.final("utf8");

    return decrypted;

}

/*
=========================================
Generate Access Token
=========================================
*/

async function generateToken() {

    try {

        const response = await axios.post(

            process.env.TONETAG_TOKEN_URL,

            qs.stringify({

                client_id: process.env.TONETAG_CLIENT_ID,
                client_secret: process.env.TONETAG_CLIENT_SECRET

            }),

            {

                headers: {

                    apikey: process.env.TONETAG_API_KEY,
                    bic: process.env.TONETAG_BIC,
                    "Content-Type": "application/x-www-form-urlencoded"

                }

            }

        );

        return response.data.data.access_token;

    } catch (err) {

        console.error(
            "ToneTag Token Error :",
            err.response?.data || err.message
        );

        throw err;

    }

}

/*
=========================================
Refresh Token
=========================================
*/

async function refreshToken(refreshTokenValue) {

    try {

        const accessToken = await generateToken();

        const response = await axios.post(

            process.env.TONETAG_REFRESH_URL,

            qs.stringify({

                grant_type: "refresh_token",
                refresh_token: refreshTokenValue,
                client_id: process.env.TONETAG_CLIENT_ID,
                client_secret: process.env.TONETAG_CLIENT_SECRET

            }),

            {

                headers: {

                    Authorization: `Bearer ${accessToken}`,
                    apikey: process.env.TONETAG_API_KEY,
                    bic: process.env.TONETAG_BIC,
                    "Content-Type": "application/x-www-form-urlencoded"

                }

            }

        );

        return response.data.data;

    } catch (err) {

        console.error(
            "ToneTag Refresh Error :",
            err.response?.data || err.message
        );

        throw err;

    }

}

/*
=========================================
Send Notification
=========================================
*/

async function sendNotification({
    amount,
    tid,
    status = 2,
    txnType = 1,
    reference
}) {

    try {

        const token = await generateToken();

        const payload = {

            amount: String(amount),
            tid: String(tid),
            status_id: String(status),
            is_tt_tid: true,
            txn_type: Number(txnType),
            unique_reference: reference

        };

        const encryptedBody = encryptPayload(payload);

        const response = await axios.post(

            process.env.TONETAG_NOTIFY_URL,

            encryptedBody,

            {

                headers: {

                    Authorization: `Bearer ${token}`,
                    apikey: process.env.TONETAG_API_KEY,
                    bic: process.env.TONETAG_BIC,
                    emode: 0,
                    "Content-Type": "text/plain"

                }

            }

        );

        let result = response.data;

        try {

            if (typeof result === "string") {

                result = JSON.parse(
                    decryptPayload(result)
                );

            }

        } catch (e) {

            // Ignore if response is already JSON

        }

        return result;

    } catch (err) {

        console.error(
            "ToneTag Notification Error :",
            err.response?.data || err.message
        );

        throw err;

    }

}

module.exports = {

    generateToken,
    refreshToken,
    encryptPayload,
    decryptPayload,
    sendNotification

};