const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Merchant document storage — restricted folder
const merchantDocStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: `mh-step-pays/merchants/${req.params.merchantId || 'temp'}`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    resource_type: 'auto',
    access_mode: 'authenticated', // signed URLs only
    transformation: [{ quality: 'auto' }],
  }),
});

// QR code storage
const qrStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'mh-step-pays/qr-codes',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    resource_type: 'image',
  },
});

const uploadMerchantDoc = multer({
  storage: merchantDocStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const uploadQR = multer({
  storage: qrStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Generate signed URL for secure document access (Admin only)
const getSignedUrl = (publicId, resourceType = 'image') => {
  return cloudinary.url(publicId, {
    sign_url: true,
    secure: true,
    resource_type: resourceType,
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  });
};

module.exports = { cloudinary, uploadMerchantDoc, uploadQR, getSignedUrl };