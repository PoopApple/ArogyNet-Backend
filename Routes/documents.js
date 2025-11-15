const express = require('express');
const router = express.Router();
const { authenticateAccessToken } = require('../Middlewares/auth');
const {
  getUploadUrl,
  confirmUpload,
  listDocuments,
  getDownloadUrl,
  deleteDocument,
} = require('../Controllers/documentController');

// Get presigned upload URL
router.post('/upload-url', authenticateAccessToken, getUploadUrl);

// Confirm upload and save metadata
router.post('/confirm', authenticateAccessToken, confirmUpload);

// List documents (with access control)
router.get('/', authenticateAccessToken, listDocuments);

// Get presigned download URL (with permission check)
router.get('/:id/download', authenticateAccessToken, getDownloadUrl);

// Delete document (patient only)
router.delete('/:id', authenticateAccessToken, deleteDocument);

module.exports = router;

