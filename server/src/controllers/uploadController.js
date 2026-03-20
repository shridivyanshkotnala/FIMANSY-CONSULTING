// import { PutObjectCommand } from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// import { r2 } from "../services/r2Client.js";
// import crypto from "crypto";

// const ALLOWED_TYPES = [
//   "application/pdf",
//   "image/png",
//   "image/jpeg",
//   "image/webp"
// ];

// export const getSignedUploadUrl = async (req, res) => {
//   try {
//     const { fileName, contentType } = req.body;

//     if (!fileName || !contentType)
//       return res.status(400).json({ message: "Invalid request" });

//     if (!ALLOWED_TYPES.includes(contentType))
//       return res.status(400).json({ message: "Unsupported file type" });

//     // sanitize filename
//     const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "");

//     // unique key prevents overwrite & enables idempotency later
//     const uniqueId = crypto.randomUUID();

//     const key = `${req.organizationId}/raw/${uniqueId}-${safeName}`;

//     const command = new PutObjectCommand({
//       Bucket: process.env.R2_BUCKET,
//       Key: key,
//       ContentType: contentType,
//       Metadata: {
//         orgId: req.organizationId,
//         uploadedBy: req.user._id.toString(),
//       },
//     });

//     const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 60 });

//     const fileUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

//     res.json({
//       uploadUrl,
//       fileUrl,
//       key,
//       expiresIn: 60
//     });

//   } catch (err) {
//     console.error("R2 signed url error:", err);
//     res.status(500).json({ message: "Upload initialization failed" });
//   }
// };


import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "../services/r2Client.js";
import {ApiError} from "../utils/ApiError.js";
import {asynchandler} from "../utils/asynchandler.js";
import extractInvoice from "../Functions/invoice-extractor.js";

const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
const ALLOWED_CONTENT_TYPES = ["application/pdf", "application/octet-stream"];
const DEFAULT_R2_BUCKET = "fimansy-documents";

const getR2Bucket = () => String(process.env.R2_BUCKET || DEFAULT_R2_BUCKET).trim();

const sanitizeFileName = (name = "invoice.pdf") =>
  String(name)
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 140) || "invoice.pdf";

const toPublicUrl = (key) => {
  const raw = String(process.env.R2_PUBLIC_URL || "").trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const base = withProtocol.replace(/\/+$/, "");
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
};

const isAllowedStorageUrl = (fileUrl) => {
  const normalized = String(fileUrl || "").trim();
  if (!normalized) return false;

  if (normalized.includes("/storage/v1/object/public/invoices/")) return true;

  const r2PublicRaw = String(process.env.R2_PUBLIC_URL || "").trim();
  if (!r2PublicRaw) return false;
  const r2Public = /^https?:\/\//i.test(r2PublicRaw) ? r2PublicRaw : `https://${r2PublicRaw}`;
  return normalized.startsWith(r2Public);
};

export const initInvoiceUpload = asynchandler(async (req, res) => {
  const { fileName, contentType, fileSize } = req.body || {};

  if (!fileName || !contentType) {
    throw new ApiError(400, "fileName and contentType are required");
  }

  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw new ApiError(400, "Unsupported file type. Only PDF is allowed");
  }

  if (fileSize && Number(fileSize) > 25 * 1024 * 1024) {
    throw new ApiError(400, "File too large");
  }

  const orgId = String(req.organizationId || "").trim();
  const userId = String(req.user?._id || "guest");
  const safeName = sanitizeFileName(fileName);
  const unique = crypto.randomUUID();
  const key = `invoices/${orgId}/${userId}/${Date.now()}-${unique}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: getR2Bucket(),
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });

  return res.status(200).json({
    success: true,
    data: {
      uploadUrl,
      key,
      fileUrl: toPublicUrl(key),
      expiresIn: 300,
    },
  });
});

/**
 * Client already uploaded file to Supabase
 * Now we ingest + process it
 */
export const ingestUploadedInvoice = asynchandler(async (req, res) => {
  const { fileUrl, documentType } = req.body;

  if (!fileUrl) {
    throw new ApiError(400, "fileUrl is required");
  }

  // basic safety — prevent random internet file parsing abuse
  if (!isAllowedStorageUrl(fileUrl)) {
    throw new ApiError(400, "Invalid storage source");
  }

  // extension validation (cheap protection before OCR cost)
  const lower = fileUrl.toLowerCase();
  const valid = ALLOWED_EXTENSIONS.some(ext => lower.endsWith(ext));

  if (!valid) {
    throw new ApiError(400, "Unsupported file format");
  }

  // optional: attach organization ownership
  const orgId = req.organizationId;
  const userId = req.user._id;

  // ---- START OCR PIPELINE ----
  const extractedData = await extractInvoice({
    fileUrl,
    orgId,
    userId
  });

  if (documentType === "expense_invoice") {
    extractedData.document_category = "expense";
  }

  return res.status(200).json(
    { success: true, extractedData }
  );
});
