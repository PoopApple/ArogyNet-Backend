const express = require('express');
const router = express.Router();
const { register, login, refresh, logout, me, changePassword } = require('../Controllers/authController');
const { authenticateAccessToken } = require('../Middlewares/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticateAccessToken, me);
router.post('/change-password', authenticateAccessToken, changePassword);

module.exports = router;
