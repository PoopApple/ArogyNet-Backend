const express = require('express');
const router = express.Router();
const { authenticateAccessToken } = require('../Middlewares/auth');
const { 
  signal,
  getICEConfiguration,
  initiateVideoCall,
  acceptVideoCall,
  endVideoCall,
  rejectVideoCall,
} = require('../Controllers/videoController');

// Public endpoint to get ICE server configuration
router.get('/ice-config', getICEConfiguration);

// WebRTC signaling fallback
router.post('/signal', authenticateAccessToken, signal);

// Video call management endpoints
router.post('/initiate', authenticateAccessToken, initiateVideoCall);
router.post('/accept', authenticateAccessToken, acceptVideoCall);
router.post('/end', authenticateAccessToken, endVideoCall);
router.post('/reject', authenticateAccessToken, rejectVideoCall);

module.exports = router;