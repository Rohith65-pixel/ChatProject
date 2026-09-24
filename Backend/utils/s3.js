import path from "path";
import crypto from "crypto";

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const AWS_REGION = process.env.AWS_REGION;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

function assertS3Env() {
  if (!AWS_REGION || !S3_BUCKET_NAME) {
    throw new Error("S3 env vars missing. Required: AWS_REGION, S3_BUCKET_NAME");
  }
}

function getS3Client() {
  assertS3Env();

  // If credentials are not provided explicitly, AWS SDK will fall back to its
  // default credential provider chain (e.g., instance roles).
  const credentials =
    AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY
      ? { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY }
      : undefined;

  return new S3Client({
    region: AWS_REGION,
    credentials,
  });
}

function sanitizeFileName(fileName = "") {
  // Remove any path segments to keep S3 keys root-only and safe.
  const base = path.basename(fileName);
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getExtensionFromFileName(fileName) {
  const safe = sanitizeFileName(fileName);
  const idx = safe.lastIndexOf(".");
  if (idx === -1) return "";
  return safe.slice(idx); // includes '.'
}

export function generateObjectKey({ userId, fileName }) {
  const ext = getExtensionFromFileName(fileName);
  const random = crypto.randomBytes(10).toString("hex");

  // Root-only key (no '/'), per your requirement.
  // Example: chat-media-<userId>-<timestamp>-<random>.png
  return `chat-media-${userId}-${Date.now()}-${random}${ext}`;
}

export function getPublicObjectUrl({ objectKey }) {
  assertS3Env();

  const encodedKey = encodeURIComponent(objectKey).replace(/%2F/g, "/");

  // us-east-1 has a slightly different hostname.
  if (AWS_REGION === "us-east-1") {
    return `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${encodedKey}`;
  }

  return `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${encodedKey}`;
}

function contentDispositionAttachment(fileName = "download") {
  const fallback = sanitizeFileName(fileName) || "download";
  const encoded = encodeURIComponent(fileName).replace(/'/g, "%27");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export async function getSignedUploadUrl({ objectKey, mimeType, expiresIn = 3600 }) {
  const s3 = getS3Client();

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: objectKey,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn });
  return { uploadUrl };
}

export async function getSignedDownloadUrl({
  objectKey,
  fileName,
  mimeType,
  expiresIn = 60,
}) {
  const s3 = getS3Client();

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: objectKey,
    ResponseContentDisposition: contentDispositionAttachment(fileName),
    ...(mimeType ? { ResponseContentType: mimeType } : {}),
  });

  const downloadUrl = await getSignedUrl(s3, command, { expiresIn });
  return { downloadUrl, expiresIn };
}

export async function deleteObjectFromS3({ objectKey }) {
  const s3 = getS3Client();

  await s3.send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: objectKey,
    })
  );
}

export default {
  getSignedUploadUrl,
  getSignedDownloadUrl,
  getPublicObjectUrl,
  deleteObjectFromS3,
  generateObjectKey,
};
