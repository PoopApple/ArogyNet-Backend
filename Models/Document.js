const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema(
  {
    // User who uploaded the file (always a patient for medical documents)
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Doctor associated with this document (if uploaded during appointment/prescription flow)
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Original filename
    originalName: { type: String, required: true },
    // MIME type
    mimeType: { type: String, required: true },
    // File size in bytes
    size: { type: Number, required: true },
    // S3 object key
    s3Key: { type: String, required: true },
    // S3 bucket name (for flexibility if using multiple buckets)
    s3Bucket: { type: String, required: true },
    // Client-side encryption flag
    encrypted: { type: Boolean, default: false },
    // Base64-encoded nonce for ChaCha20-Poly1305 decryption
    encryptionNonce: { type: String, default: null },
    // Encryption key identifier (to lookup key on client)
    encryptionKeyId: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', DocumentSchema);

