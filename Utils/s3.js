const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;
const UPLOAD_EXPIRY = 60 * 5; // 5 minutes for upload
const DOWNLOAD_EXPIRY = 60 * 60; // 1 hour for download

/**
 * Generate a unique S3 key for a file
 * @param {string} userId - User ID uploading the file
 * @param {string} originalName - Original filename
 * @returns {string} S3 key
 */
const generateS3Key = (userId, originalName) => {
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(8).toString('hex');
  const sanitized = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  return `documents/${userId}/${timestamp}-${randomStr}-${sanitized}`;
};

/**
 * Generate presigned URL for uploading a file to S3
 * @param {string} s3Key - S3 object key
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<string>} Presigned upload URL
 */
const getPresignedUploadUrl = async (s3Key, contentType) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    ContentType: contentType,
  });
  // eslint-disable-next-line no-console
  console.log('[S3] generate-upload-url:start', {
    bucket: BUCKET_NAME,
    key: s3Key,
    contentType,
    expiresIn: UPLOAD_EXPIRY,
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn: UPLOAD_EXPIRY });
  // eslint-disable-next-line no-console
  console.log('[S3] generate-upload-url:success', { key: s3Key });
  return url;
};

/**
 * Generate presigned URL for downloading a file from S3
 * @param {string} s3Key - S3 object key
 * @returns {Promise<string>} Presigned download URL
 */
const getPresignedDownloadUrl = async (s3Key) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });
  // eslint-disable-next-line no-console
  console.log('[S3] generate-download-url:start', {
    bucket: BUCKET_NAME,
    key: s3Key,
    expiresIn: DOWNLOAD_EXPIRY,
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn: DOWNLOAD_EXPIRY });
  // eslint-disable-next-line no-console
  console.log('[S3] generate-download-url:success', { key: s3Key });
  return url;
};

/**
 * Delete a file from S3
 * @param {string} s3Key - S3 object key
 * @returns {Promise<void>}
 */
const deleteFromS3 = async (s3Key) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });
  // eslint-disable-next-line no-console
  console.log('[S3] delete-object:start', { bucket: BUCKET_NAME, key: s3Key });
  await s3Client.send(command);
  // eslint-disable-next-line no-console
  console.log('[S3] delete-object:success', { key: s3Key });
};

module.exports = {
  generateS3Key,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  deleteFromS3,
  BUCKET_NAME,
};
