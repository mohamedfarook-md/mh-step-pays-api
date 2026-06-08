 const express = require('express');
const router = express.Router();
const { adminLogin, agentRegister, agentLogin, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/admin/login', adminLogin);
router.post('/agent/register', agentRegister);
router.post('/agent/login', agentLogin);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;