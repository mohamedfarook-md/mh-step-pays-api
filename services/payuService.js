const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
// ======================================================
// ENVIRONMENT VARIABLES
// ======================================================

const AUTH_BASE_URL = process.env.PAYU_AUTH_BASE_URL;
const BASE_URL = process.env.PAYU_BASE_URL;

const CLIENT_ID = process.env.PAYU_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYU_CLIENT_SECRET;
const PARTNER_UUID = process.env.PAYU_PARTNER_UUID;

// ======================================================
// AXIOS INSTANCE
// ======================================================

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
});

// ======================================================
// TOKEN CACHE
// ======================================================

let accessToken = null;
let expiresAt = null;

// ======================================================
// CHECK TOKEN
// ======================================================

function tokenExpired() {

    if (!accessToken) return true;

    if (!expiresAt) return true;

    return Date.now() >= expiresAt;

}

// ======================================================
// GET ACCESS TOKEN
// ======================================================

async function getAccessToken() {

    try {

        if (!tokenExpired()) {

            return accessToken;

        }

        const body = new URLSearchParams();

        body.append("client_id", CLIENT_ID);
        body.append("client_secret", CLIENT_SECRET);
        body.append("grant_type", "client_credentials");

        
       body.append(
    "scope",
    "refer_merchant"
);


console.log("AUTH_BASE_URL:", AUTH_BASE_URL);
console.log("BASE_URL:", BASE_URL);
console.log("TOKEN URL:", `${AUTH_BASE_URL}/oauth/token`);

        const response = await axios.post(

            `${AUTH_BASE_URL}/oauth/token`,

            body,

            {
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded",
                    Accept: "application/json"
                }
            }

        );

        accessToken = response.data.access_token;
        console.log(
    "PAYU GRANTED SCOPE:",
    response.data.scope
);

        console.log("========== FRESH PAYU TOKEN ==========");
console.log(accessToken);
console.log("======================================");

        expiresAt =
            Date.now() +
            ((response.data.expires_in - 60) * 1000);

        return accessToken;

    }
    catch (err) {

        console.error("=================================");
        console.error("PAYU TOKEN ERROR");
        console.error("=================================");

        if (err.response) {

            console.error(err.response.data);

        } else {

            console.error(err.message);

        }

        throw err;

    }

}

// ======================================================
// COMMON HEADERS
// ======================================================

async function jsonHeaders() {

    const token = await getAccessToken();

    return {

        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json"

    };

}

async function multipartHeaders(form) {

    const token = await getAccessToken();

    return {

        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...form.getHeaders()

    };

}

// ======================================================
// ERROR HANDLER
// ======================================================

function handleError(error) {

    if (error.response) {

        return {

            success: false,

            status: error.response.status,

            data: error.response.data

        };

    }

    return {

        success: false,

        status: 500,

        data: {

            message: error.message

        }

    };

}

// ======================================================
// PAYU BUSINESS ENTITY SUB TYPE MAPPING
// ======================================================

// function getPayUBusinessEntitySubType(entityType) {

//     const mapping = {
//         Individual: null,

//         "Sole Proprietorship": null,

//         Partnership: "partnership",

//         LLP: "llp",

//         "Private Limited": "company_owned",

//         "Public Limited": "company_owned",

//         "One Person Company": "company_owned",

//         Trust: "trust",

//         Society: "society",

//         NGO: "ngo",
//     };

//     return mapping[entityType] ?? null;
// }

// ======================================================
// PAYU BUSINESS ENTITY SUB TYPE MAPPING
// ======================================================

// function getPayUBusinessEntitySubType(entityType) {

//     const mapping = {
//         Individual: "company_owned",
//     };

//     return mapping[entityType] ?? null;
// }

function getPayUBusinessEntitySubType(entityType) {

    const mapping = {
        Individual: "company_owned",

        "Sole Proprietorship": "company_owned",

        Partnership: "partner_retail",

        LLP: "partner_retail",

        "Private Limited": "company_owned",

        "Public Limited": "company_owned",

        "One Person Company": "company_owned",

        Trust: "company_owned",

        Society: "company_owned",

        NGO: "company_owned",

        Government: "company_owned",

        "Hindu Undivided Family": "company_owned",
    };

    return mapping[entityType] ?? null;
}
// ======================================================
// CREATE FORM DATA
// ======================================================

function buildMerchantForm(merchant) {

    const form = new FormData();

    console.log("Merchant Object:");
console.log(merchant);

    form.append(
        "merchant[display_name]",
        merchant.shopName
    );

    form.append(
        "merchant[email]",
        merchant.email
    );

    form.append(
        "merchant[mobile]",
        merchant.mobile
    );

    form.append(
        "merchant[product]",
        "PayUbiz"
    );

    form.append(
        "merchant[onboarding_type]",
        "offline"
    );

    form.append(
        "merchant[pos_merchant]",
        "false"
    );

    form.append(
        "merchant[business_details][business_entity_type]",
        merchant.entityType
    );

    const payuSubType =
    getPayUBusinessEntitySubType(
        merchant.entityType
    );

if (payuSubType) {
    form.append(
        "merchant[business_entity_sub_type]",
        payuSubType
    );
}



    return form;

}


// ======================================================
// CREATE MERCHANT
// ======================================================

async function createMerchant(merchant) {

    try {

        const form = buildMerchantForm(merchant);

        const headers = await multipartHeaders(form);

        const response = await api.post(
            "/api/v3/merchants",
            form,
            {
                headers
            }
        );

        return {
            success: true,
            data: response.data
        };

    } catch (error) {

        return handleError(error);

    }

}

// ======================================================
// UPDATE MERCHANT
// ======================================================

async function updateMerchant(uuid, payload) {

    try {

        const form = new FormData();

        Object.entries(payload).forEach(([key, value]) => {

            if (
                value !== undefined &&
                value !== null &&
                value !== ""
            ) {
                form.append(key, value);
            }

        });

        const headers = await multipartHeaders(form);

        const response = await api.put(
            `/api/v1/merchants/${uuid}/update`,
            form,
            {
                headers
            }
        );

        return {
            success: true,
            data: response.data
        };

    } catch (error) {

        return handleError(error);

    }

}

// ======================================================
// GET MERCHANT DETAILS
// ======================================================

async function getMerchant(uuid) {

    try {

        const headers = await jsonHeaders();

        const response = await api.get(
            `/api/v1/merchants/${uuid}`,
            {
                headers
            }
        );

        return {
            success: true,
            data: response.data
        };

    } catch (error) {

        return handleError(error);

    }

}

// ======================================================
// GET MERCHANT STATUS
// ======================================================

async function getMerchantStatus(uuid) {

    try {

        const headers = await jsonHeaders();

        const response = await api.get(
            `/api/v1/merchants/${uuid}/status`,
            {
                headers
            }
        );

        return {
            success: true,
            data: response.data
        };

    } catch (error) {

        return handleError(error);

    }

}



async function getMerchant(mid) {

    const headers = await jsonHeaders();

    const response = await api.get(
        `/api/v1/merchants/${mid}`,
        { headers }
    );

    return {
        success: true,
        data: response.data
    };

}
// ======================================================
// GENERIC GET
// ======================================================

async function apiGet(url) {

    try {

        const headers = await jsonHeaders();

        const response = await api.get(
            url,
            {
                headers
            }
        );

        return {
            success: true,
            data: response.data
        };

    } catch (error) {

        return handleError(error);

    }

}

// ======================================================
// GENERIC POST
// ======================================================

// async function apiPost(url, form) {

//     try {


//         console.log("apiPost() called");
// console.log("URL:", url);
//         const headers = await multipartHeaders(form);

//         const response = await api.post(
//             url,
//             form,
//             {
//                 headers
//             }
//         );

//         return {
//             success: true,
//             data: response.data
//         };

//     } 
//     catch (error) {

//     console.log("========== API POST ERROR ==========");
//     console.log("Status:", error.response?.status);
//     console.log("Data:", JSON.stringify(error.response?.data, null, 2));
//     console.log("Message:", error.message);

//     return handleError(error);

// }

// }



// async function apiPost(url, form) {
//     try {

//         console.log("apiPost() called");
//         console.log("URL:", url);

//         const headers = await multipartHeaders(form);

//         const contentLength =
//             await new Promise((resolve, reject) => {
//                 form.getLength((err, length) => {
//                     if (err) reject(err);
//                     else resolve(length);
//                 });
//             });

//         headers["Content-Length"] = contentLength;

//         console.log(
//             "CONTENT LENGTH:",
//             contentLength
//         );

//         console.log(
//             "HEADERS:",
//             headers
//         );

//         const response = await api.post(
//             url,
//             form,
//             {
//                 headers,
//                 maxContentLength: Infinity,
//                 maxBodyLength: Infinity,
//             }
//         );

//         return {
//             success: true,
//             data: response.data
//         };

//         } catch (error) {

//         console.log(
//             "========== FULL PAYU ERROR =========="
//         );

//         console.log(
//             "MESSAGE:",
//             error.message
//         );

//         console.log(
//             "CODE:",
//             error.code
//         );

//         console.log(
//             "URL:",
//             error.config?.baseURL +
//             error.config?.url
//         );

//         console.log(
//             "METHOD:",
//             error.config?.method
//         );

//         console.log(
//             "REQUEST HEADERS:",
//             error.config?.headers
//         );

//         console.log(
//             "STATUS:",
//             error.response?.status
//         );

//         console.log(
//             "RESPONSE HEADERS:",
//             error.response?.headers
//         );

//         console.log(
//             "RESPONSE DATA:",
//             JSON.stringify(
//                 error.response?.data,
//                 null,
//                 2
//             )
//         );

//         console.log(
//             "====================================="
//         );

//         return handleError(error);
//     }}




// ======================================================
// GENERIC POST
// Supports BOTH JSON and FormData
// ======================================================

async function apiPost(url, data) {

    try {

        console.log("apiPost() called");
        console.log("URL:", url);

        let headers;
        let requestData = data;

        // ==========================================
        // FORM DATA REQUEST
        // ==========================================

        if (data && typeof data.getHeaders === "function") {

            headers = await multipartHeaders(data);

            const contentLength =
                await new Promise((resolve, reject) => {

                    data.getLength((err, length) => {

                        if (err) {
                            reject(err);
                        } else {
                            resolve(length);
                        }

                    });

                });

            headers["Content-Length"] = contentLength;

            console.log("REQUEST TYPE: MULTIPART");
            console.log("CONTENT LENGTH:", contentLength);

        }

        // ==========================================
        // JSON REQUEST
        // ==========================================

        else {

            headers = await jsonHeaders();

            console.log("REQUEST TYPE: JSON");
            console.log(
                "PAYLOAD:",
                JSON.stringify(data, null, 2)
            );

        }

        console.log("HEADERS:", {
            ...headers,
            Authorization: headers.Authorization
                ? "Bearer ****"
                : undefined
        });

        // ==========================================
        // PAYU REQUEST
        // ==========================================

        const response = await api.post(
            url,
            requestData,
            {
                headers,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            }
        );

        console.log("========== PAYU POST RESPONSE ==========");

        console.log(
            JSON.stringify(
                response.data,
                null,
                2
            )
        );

        console.log("========================================");

        return {

            success: true,

            data: response.data

        };

    } catch (error) {

        console.log(
            "========== FULL PAYU ERROR =========="
        );

        console.log(
            "MESSAGE:",
            error.message
        );

        console.log(
            "CODE:",
            error.code
        );

        console.log(
            "URL:",
            error.config?.baseURL +
            (error.config?.url || "")
        );

        console.log(
            "METHOD:",
            error.config?.method
        );

        console.log(
            "REQUEST HEADERS:",
            error.config?.headers
        );

        console.log(
            "STATUS:",
            error.response?.status
        );

        console.log(
            "RESPONSE HEADERS:",
            error.response?.headers
        );

        console.log(
            "RESPONSE DATA:",
            JSON.stringify(
                error.response?.data,
                null,
                2
            )
        );

        console.log(
            "====================================="
        );

        return handleError(error);

    }

}
// ======================================================
// GENERIC PUT
// ======================================================

// async function apiPut(url, form) {

//     try {

//         const headers = await multipartHeaders(form);

//         const response = await api.put(
//             url,
//             form,
//             {
//                 headers
//             }
//         );

//         return {
//             success: true,
//             data: response.data
//         };

//     } catch (error) {

//         return handleError(error);

//     }

// }



async function apiPut(url, form) {
    try {

        const headers = await multipartHeaders(form);

        console.log("========== PAYU REQUEST ==========");
        console.log("URL:", url);
        console.log("HEADERS:", headers);
       console.log("========== FORM DATA DEBUG ==========");
console.log(form);

        const response = await api.put(
            url,
            form,
            {
                headers
            }
        );
        console.log("========== PAYU PUT RESPONSE ==========");

console.log(
    JSON.stringify(response.data, null, 2)
);

        return {
            success: true,
            data: response.data
        };

        } catch (error) {

        console.log(
            "========== FULL PAYU ERROR =========="
        );

        console.log(
            "MESSAGE:",
            error.message
        );

        console.log(
            "CODE:",
            error.code
        );

        console.log(
            "URL:",
            error.config?.baseURL +
            error.config?.url
        );

        console.log(
            "METHOD:",
            error.config?.method
        );

        console.log(
            "REQUEST HEADERS:",
            error.config?.headers
        );

        console.log(
            "STATUS:",
            error.response?.status
        );

        console.log(
            "RESPONSE HEADERS:",
            error.response?.headers
        );

        console.log(
            "RESPONSE DATA:",
            JSON.stringify(
                error.response?.data,
                null,
                2
            )
        );

        console.log(
            "====================================="
        );

        return handleError(error);
    }
    
}



// ======================================================
// UPDATE PAN DETAILS
// ======================================================

async function updatePanAndDOB(uuid, panData) {

    const form = new FormData();

   form.append("merchant[pancard_number]", panData.panNumber);

form.append("merchant[pancard_name]", panData.panName);

form.append("merchant[dob]", panData.dob);

    return await apiPut(
        `/api/v1/merchants/${uuid}/update`,
        form
    );

}



// ======================================================
// ADD SIGNATORY DETAILS
// ======================================================

async function addSignatoryDetails(uuid, data) {

    const form = new FormData();

    form.append(
        "merchant[signatory_contact_details_attributes][0][authorised_signatory]",
        "true"
    );

    form.append(
        "merchant[signatory_contact_details_attributes][0][name]",
        data.name
    );

    form.append(
        "merchant[signatory_contact_details_attributes][0][pancard_number]",
        data.panNumber
    );

    form.append(
        "merchant[signatory_contact_details_attributes][0][email]",
        data.email
    );

    form.append(
        "merchant[signatory_contact_details_attributes][0][contact_detail_type]",
        "Signing Authority"
    );

    // CIN only for eligible entities
    if (data.cinNumber) {
        form.append(
            "merchant[signatory_contact_details_attributes][0][cin_number]",
            data.cinNumber
        );
    }

    return await apiPut(
        `/api/v1/merchants/${uuid}/signatory_details`,
        form
    );
}



// ======================================================
// ADD / UPDATE UBO
// ======================================================

async function addUBO(uuid, beneficiaries = []) {

    const form = new FormData();

    beneficiaries.forEach((ubo, index) => {

        form.append(
            `merchant[ubo[${index}][beneficiary_name]]`,
            ubo.beneficiaryName
        );

        form.append(
            `merchant[ubo[${index}][ubo_pan_number]]`,
            ubo.panNumber
        );

        form.append(
            `merchant[ubo[${index}][ownership_percent]]`,
            String(ubo.ownershipPercent)
        );

        form.append(
            `merchant[ubo[${index}][dob]]`,
            ubo.dob
        );

        form.append(
            `merchant[ubo[${index}][nationality]]`,
            ubo.nationality || "IN"
        );

        if (ubo.email) {
            form.append(
                `merchant[ubo[${index}][email]]`,
                ubo.email
            );
        }

        if (ubo.address?.addressLine) {
            form.append(
                `merchant[ubo[${index}][address][address_line]]`,
                ubo.address.addressLine
            );
        }

        if (ubo.address?.pincode) {
            form.append(
                `merchant[ubo[${index}][address][pincode]]`,
                ubo.address.pincode
            );
        }
    });

    // UBO exists
    form.append(
        "merchant[ubo_exist]",
        "1"
    );

    return await apiPut(
        `/api/v1/merchants/${uuid}/signatory_details`,
        form
    );
}

// ======================================================
// INITIATE DIGILOCKER VERIFICATION
// ======================================================

// ======================================================
// GENERATE DIGILOCKER LINK
// ======================================================

async function initiateDigiLocker(mid) {

    try {

        const headers = await jsonHeaders();

        const response = await api.post(
            `/api/v3/merchants/${mid}/kyc_document/generate_digilocker_link`,
            {
                consent: true
            },
            {
                headers
            }
        );

        return {
            success: true,
            data: response.data
        };

    } catch (error) {

        return handleError(error);

    }

}



// ======================================================
// UPDATE GEO LOCATION
// ======================================================

async function updateGeoLocation(uuid, location) {

    const form = new FormData();

    form.append(
        "merchant[latitude]",
        location.latitude
    );

    form.append(
        "merchant[longitude]",
        location.longitude
    );

    return await apiPut(
        `/api/v1/merchants/${uuid}/update`,
        form
    );

}



// ======================================================
// SUBMIT CONSENTS
// ======================================================

async function submitConsents(uuid) {

    try {

        const headers = await jsonHeaders();

        const response = await api.post(

            `/api/v1/merchants/${uuid}/submit_consents`,

            {
                consents: [
                    {
                        name: "skip_ckyc_flow",
                        provided_by_uuid: PARTNER_UUID
                    }
                ]
            },

            {
                headers
            }

        );

        return {
            success: true,
            data: response.data
        };

    } catch (error) {

        return handleError(error);

    }

}

// ======================================================
// SEND CKYC OTP
// ======================================================

async function sendCKYCOTP(mid, mobile) {

    const form = new FormData();

    form.append("merchant_id", mid);
    form.append("mobile", mobile);
    form.append("consent", "true");

    return await apiPost(
        "/api/v3/merchants/kyc_document/send_ckyc_otp",
        form
    );

}

// ======================================================
// VERIFY CKYC OTP
// ======================================================

async function verifyCKYCOTP(mid, otp) {

    const form = new FormData();

    form.append("merchant_id", mid);
    form.append("otp", otp.toString());

    return await apiPost(
        "/api/v3/merchants/kyc_document/verify_ckyc_otp",
        form
    );

}

// ======================================================
// FETCH CKYC DETAILS
// ======================================================

async function fetchCKYC(mid) {

    const form = new FormData();

    form.append("merchant_id", mid);
    form.append("consent", "true");

    return await apiPost(
        "/api/v3/merchants/kyc_document/ckyc_data",
        form
    );

}

// ======================================================
// UPDATE BUSINESS DETAILS
// ======================================================

// async function updateBusiness(uuid, business) {

//     const form = new FormData();

//     Object.entries(business).forEach(([key, value]) => {

//         if (
//             value !== undefined &&
//             value !== null &&
//             value !== ""
//         ) {

//             form.append(
//                 `merchant[business_details][${key}]`,
//                 value
//             );

//         }

//     });

//   return await apiPut(
//     `/api/v1/merchants/${uuid}/update`,
//     form
// );

// }



// async function updateBusiness(uuid, business) {

//     const form = new FormData();

//     console.log("========== BUSINESS OBJECT ==========");
// console.log(business);
//     if (business.business_category)
//         form.append("merchant[business_category]", business.business_category);

//     if (business.business_sub_category)
//         form.append("merchant[business_sub_category]", business.business_sub_category);
//     console.log(
//   "SUB CATEGORY VALUE:",
//   business.business_sub_category
// );

//     if (business.expected_monthly_sales)
//         form.append("merchant[monthly_expected_volume]", business.expected_monthly_sales);

//     if (business.trade_name)
//         form.append("merchant[business_name]", business.trade_name);

//     if (business.gstin) {
//         form.append("merchant[gst_number]", business.gstin);
//         form.append("merchant[gst_consent]", "true");
//     }

//     if (business.cin)
//         form.append("merchant[cin_number]", business.cin);


  

//     console.log("========== PAYLOAD ==========");
// console.log({
//     business_category: business.business_category,
//     business_sub_category: business.business_sub_category,
//     business_name: business.trade_name,
//     monthly_expected_volume: business.expected_monthly_sales,
//     gst_number: business.gstin,
//     cin_number: business.cin
// });

// console.log("========== FINAL FORM VALUES ==========");

// console.log({
//     category: business.business_category,
//     subCategory: business.business_sub_category,
//     monthlyVolume: business.expected_monthly_sales,
//     businessName: business.trade_name
// });

//    const response = await apiPut(
//     `/api/v1/merchants/${uuid}/update`,
//     form
// );

// console.log("========== PAYU RESPONSE ==========");
// console.log(JSON.stringify(response, null, 2));

// return response;

// }








// async function updateBusiness(uuid, business) {

//     const form = new FormData();

//     console.log("========== BUSINESS OBJECT ==========");
//     console.log(business);

//     // Business Category
//     if (business.business_category) {
//         form.append(
//             "merchant[business_category]",
//             business.business_category
//         );
//     }

//     // Business Sub Category
//     if (business.business_sub_category) {
//         form.append(
//             "merchant[business_sub_category]",
//             business.business_sub_category
//         );
//     }


    

   

//    console.log("SUB CATEGORY NAME:", business.business_sub_category);

// console.log(
//     "SUB CATEGORY UUID:",
//     "3026-06eb-3742979d-c815-c5a77b693c53"
// );

//     // Monthly Expected Volume
//     if (business.expected_monthly_sales) {
//         form.append(
//             "merchant[monthly_expected_volume]",
//             business.expected_monthly_sales
//         );
//     }

//     // Business Name
//     if (business.trade_name) {
//         form.append(
//             "merchant[business_name]",
//             business.trade_name
//         );
//     }

//     // GST
//     if (business.gstin) {
//         form.append(
//             "merchant[gst_number]",
//             business.gstin
//         );

//         form.append(
//             "merchant[gst_consent]",
//             "true"
//         );
//     }

//     // CIN
//     if (business.cin) {
//         form.append(
//             "merchant[cin_number]",
//             business.cin
//         );
//     }

//     console.log("========== FINAL FORM VALUES ==========");

//     console.log({
//         category: business.business_category,
//         subCategory: business.business_sub_category,
//         monthlyVolume: business.expected_monthly_sales,
//         businessName: business.trade_name
//     });

//     const response = await apiPut(
//         `/api/v1/merchants/${uuid}/update`,
//         form
//     );

//     console.log("========== PAYU RESPONSE ==========");
//     console.log(JSON.stringify(response, null, 2));

//     return response;
// }



async function updateBusiness(uuid, business) {

    const form = new FormData();

    console.log("========== BUSINESS OBJECT ==========");
    console.log(business);

    // Business Category
    if (business.business_category) {
        form.append(
            "merchant[business_category]",
            business.business_category
        );
    }

    // Business Sub Category
    if (business.business_sub_category) {
        form.append(
            "merchant[business_sub_category]",
            business.business_sub_category
        );
    }

    // Monthly Expected Volume
    if (business.expected_monthly_sales) {
        form.append(
            "merchant[monthly_expected_volume]",
            String(business.expected_monthly_sales)
        );
    }

    // ==========================================
    // BUSINESS NAME
    // ==========================================

//    const businessName = String(
//     business.trade_name || ""
// ).trim();

// console.log("FINAL PAYU BUSINESS NAME:", JSON.stringify(businessName));

// if (!businessName) {
//     throw new Error("Business name is missing");
// }

// form.append(
//     "merchant[business_name]",
//     businessName
// );
    // GST
    if (business.gstin) {

        form.append(
            "merchant[gst_number]",
            String(business.gstin).trim()
        );

        form.append(
            "merchant[gst_consent]",
            "true"
        );
    }

    // CIN
    if (business.cin) {

        form.append(
            "merchant[cin_number]",
            String(business.cin).trim()
        );

    }

    console.log(
        "========== FINAL FORM VALUES =========="
    );

    console.log({
        category:
            business.business_category,

        subCategory:
            business.business_sub_category,

        monthlyVolume:
            business.expected_monthly_sales,

        businessName:
            business.trade_name,

        gst:
            business.gstin,

        cin:
            business.cin
    });

    const response = await apiPut(
        `/api/v1/merchants/${uuid}/update`,
        form
    );

    console.log(
        "========== PAYU RESPONSE =========="
    );

    console.log(
        JSON.stringify(
            response,
            null,
            2
        )
    );

    return response;
}

async function getMerchantDetails(uuid) {
    return await apiGet(
        `/api/v1/merchants/${uuid}`
    );
}

// ======================================================
// UPDATE ADDRESS
// ======================================================

async function updateAddress(uuid, address) {

    const form = new FormData();

    Object.entries(address).forEach(([key, value]) => {

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            form.append(

                `merchant[address][${key}]`,

                value

            );

        }

    });

    return await apiPut(

        `/api/v1/merchants/${uuid}/address`,

        form

    );

}

// ======================================================
// UPDATE WEBSITE DETAILS
// ======================================================

async function updateWebsite(uuid, website) {

    const form = new FormData();

    if (website.url) {

        form.append(
            "merchant[website]",
            website.url
        );

    }

    if (website.facebook) {

        form.append(
            "merchant[facebook]",
            website.facebook
        );

    }

    if (website.instagram) {

        form.append(
            "merchant[instagram]",
            website.instagram
        );

    }

    return await apiPut(

        `/api/v1/merchants/${uuid}/website`,

        form

    );

}

// ======================================================
// UPDATE BANK DETAILS
// ======================================================

async function updateBank(uuid, bank) {

    const form = new FormData();

   form.append(
    "merchant[bank_detail][bank_account_number]",
    bank.accountNumber
);

form.append(
    "merchant[bank_detail][holder_name]",
    bank.accountHolder
);

form.append(
    "merchant[bank_detail][ifsc_code]",
    bank.ifsc
);

   return await apiPut(
    `/api/v1/merchants/${uuid}/update`,
    form
);

}



// ======================================================
// UPDATE INTEGRATION TYPE - SKIP WEBSITE
// ======================================================

async function updateIntegrationType(uuid) {

    const form = new FormData();

    form.append(
        "merchant[integration_type]",
        "Tools"
    );

    console.log("========== INTEGRATION TYPE FORM ==========");
    console.log(form);

    return await apiPut(
        `/api/v1/merchants/${uuid}/update`,
        form
    );
}

// ======================================================
// CREATE VKYC PROFILE
// ======================================================

// async function createVKYCProfile(mid) {

//     const form = new FormData();

//     form.append(
//         "merchant_id",
//         mid
//     );

//     return await apiPost(
//         "/api/v3/merchants/kyc_document/create_vkyc_profile",
//         form
//     );

// }


async function createVKYCProfile(mid) {

    const payload = {
        merchant_id: mid
    };

    return await apiPost(
        "/api/v3/merchants/kyc_document/create_vkyc_profile",
        payload
    );

}




// ======================================================
// UPLOAD DOCUMENT
// ======================================================

async function uploadDocument(uuid, documentType, fileBuffer, fileName) {

    try {

        const form = new FormData();

        form.append("document_type", documentType);

        form.append(
            "document",
            fileBuffer,
            {
                filename: fileName
            }
        );

        const headers = await multipartHeaders(form);

        const response = await api.post(

            `/api/v1/merchants/${uuid}/documents`,

            form,

            {
                headers
            }

        );

        return {

            success: true,

            data: response.data

        };

    } catch (error) {

        return handleError(error);

    }

}

// ======================================================
// SUBMIT MERCHANT
// ======================================================

async function submitMerchant(uuid) {

    try {

        const headers = await jsonHeaders();

        const response = await api.post(

            `/api/v1/merchants/${uuid}/submit`,

            {},

            {
                headers
            }

        );

        return {

            success: true,

            data: response.data

        };

    } catch (error) {

        return handleError(error);

    }

}

// ======================================================
// GENERATE AGREEMENT
// ======================================================

// async function generateAgreement(uuid) {

//     try {

//         const headers = await jsonHeaders();

//         const response = await api.post(

//             `/api/v1/merchants/${uuid}/agreement`,

//             {},

//             {
//                 headers
//             }

//         );

//         return {

//             success: true,

//             data: response.data

//         };

//     } catch (error) {

//         return handleError(error);

//     }

// }



// ======================================================
// GENERATE AGREEMENT FOR E-SIGN
// ======================================================
async function generateAgreement(uuid) {

    try {

        console.log("========== PAYU AGREEMENT REQUEST ==========");
        console.log("Merchant UUID:", uuid);
        console.log(
            "URL:",
            `${process.env.PAYU_BASE_URL}/api/v1/merchants/${uuid}/generate_merged_document_for_esign`
        );

        const headers = await jsonHeaders();

        console.log("Agreement Headers:", {
            Authorization: headers.Authorization ? "Bearer ****" : "Missing",
            Accept: headers.Accept,
        });

        const response = await api.get(
            `/api/v1/merchants/${uuid}/generate_merged_document_for_esign`,
            {
                headers,
                timeout: 30000
            }
        );

        console.log("========== PAYU AGREEMENT RESPONSE ==========");
        console.log("STATUS:", response.status);
        console.log(
            "DATA:",
            JSON.stringify(response.data, null, 2)
        );
        console.log("=============================================");

        return {

            success: true,

            data: response.data

        };

    } catch (error) {

        console.log("========== PAYU AGREEMENT ERROR ==========");

        console.log("MESSAGE:", error.message);
        console.log("CODE:", error.code);
        console.log("STATUS:", error.response?.status);

        console.log(
            "RESPONSE DATA:",
            JSON.stringify(
                error.response?.data,
                null,
                2
            )
        );

        console.log(
            "RESPONSE HEADERS:",
            error.response?.headers
        );

        console.log("==========================================");

        return handleError(error);

    }

}






// ======================================================
// GET AGREEMENT STATUS
// ======================================================

async function getAgreementStatus(uuid) {

    try {

        const headers = await jsonHeaders();

        const response = await api.get(

            `/api/v1/merchants/${uuid}/agreement`,

            {
                headers
            }

        );

        return {

            success: true,

            data: response.data

        };

    } catch (error) {

        return handleError(error);

    }

}


// ======================================================
// FETCH REQUIRED DOCUMENTS
// ======================================================

async function getRequiredDocuments(mid) {

    return await apiGet(
        `/api/v3/merchants/${mid}/kyc_document/required_docs`
    );

}


// // ======================================================
// // UPLOAD KYC DOCUMENT
// // ======================================================

// const fs = require("fs");


// async function uploadKYCDocument(mid, document) {

// //     const form = new FormData();

// //     // form.append(
// //     //     "merchant[document_category]",
// //     //     document.documentCategory
// //     // );


// //     form.append(
// //     "merchant[document_category]",
// //     "103"
// // );
// //     form.append(
// //         "merchant[document_type]",
// //         document.documentType
// //     );

// //     form.append(
// //         "merchant[processed_document]",
// //         fs.createReadStream(document.filePath)
// //     );



    

// //     return await apiPost(
// //         `/api/v3/merchants/${mid}/kyc_document`,
// //         form
// //     );






// const form = new FormData();

// form.append(
//     "document_category",
//     document.documentCategory
// );

// form.append(
//     "document_type",
//     document.documentType
// );

// form.append(
//     "processed_document",
//     fs.createReadStream(document.filePath)
// );

// return await apiPost(
//     `/api/v3/merchants/${mid}/kyc_document`,
//     form
// );

// }








// ======================================================
// UPLOAD KYC DOCUMENT
// ======================================================

async function uploadKYCDocument(mid, document) {

    const form = new FormData();

    form.append(
        "merchant[document_category]",
        document.documentCategory
    );

    form.append(
        "merchant[document_type]",
        document.documentType
    );

    form.append(
        "merchant[processed_document]",
        fs.createReadStream(document.filePath)
    );


   console.log(
    "========== FORM DATA HEADERS =========="
);

console.log(form.getHeaders());

console.log(
    "Document Category:",
    document.documentCategory
);

console.log(
    "Document Type:",
    document.documentType
);

console.log(
    "Document File:",
    document.filePath
);

console.log(
    "======================================"
);
    console.log("========== KYC UPLOAD ==========");
    console.log("MID:", mid);
    console.log("Document Category:", document.documentCategory);
    console.log("Document Type:", document.documentType);
    console.log("File:", document.filePath);
    console.log("================================");

    return await apiPost(
        `/api/v3/merchants/${mid}/kyc_document`,
        form
    );
}



// ======================================================
// UPLOAD CPV / SHOP VERIFICATION PHOTO
// ======================================================
// ======================================================
// UPLOAD CPV / SHOP VERIFICATION PHOTO
// ======================================================

async function uploadCPVDocument(mid, filePath) {

    const form = new FormData();

    // PayU confirmed CPV values - Test / UAT
  form.append(
    "merchant[document_category]",
    "Contact Point Verification"
);

form.append(
    "merchant[document_type]",
    "Store Photos"
);

    form.append(
        "merchant[processed_document]",
        fs.createReadStream(filePath)
    );

    console.log("========== CPV UPLOAD ==========");
    console.log("MID:", mid);
    console.log("Document Category:", "159");
    console.log("Document Type:", "189");
    console.log("File:", filePath);
    console.log("================================");

    return await apiPost(
        `/api/v3/merchants/${mid}/kyc_document`,
        form
    );
}
// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    PARTNER_UUID,

    getAccessToken,

    jsonHeaders,

    multipartHeaders,

    handleError,

    buildMerchantForm,

    createMerchant,

    updateMerchant,

    getMerchant,

    getMerchantStatus,

    apiGet,

    apiPost,

    apiPut,

    updatePanAndDOB,

    sendCKYCOTP,

    verifyCKYCOTP,

    fetchCKYC,

    updateBusiness,

    updateAddress,

    updateWebsite,

    updateBank,

    uploadDocument,

    submitMerchant,

    generateAgreement,

    getAgreementStatus,

    updateGeoLocation,

    createVKYCProfile,

    getRequiredDocuments,

    addSignatoryDetails,

    uploadKYCDocument,

    uploadCPVDocument,

    addUBO,

    submitConsents,

    initiateDigiLocker,

    updateIntegrationType,

    getMerchantDetails

};