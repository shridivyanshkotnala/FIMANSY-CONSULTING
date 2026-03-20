import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import mongoose from "mongoose";
import { r2 } from "./r2Client.js";
import { CompanyDocument } from "../models/companyDocumentModel.js";

const ALLOWED_CONTENT_TYPES = new Set(["application/pdf", "application/octet-stream"]);
const ALLOWED_DOCUMENT_TYPES = new Set(["loan", "equity", "other"]);
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const DEFAULT_R2_BUCKET = "fimansy-documents";

const getR2Bucket = () => String(process.env.R2_BUCKET || DEFAULT_R2_BUCKET).trim();

const encodeObjectKey = (key = "") =>
  String(key)
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");

const normalizeObjectKey = (key = "") => {
  const raw = String(key || "").trim().replace(/^\/+/, "");
  if (!raw) return "";

  const bucket = getR2Bucket();
  if (raw === bucket) return "";
  if (raw.startsWith(`${bucket}/`)) return raw.slice(bucket.length + 1);
  return raw;
};

const sanitizeFileName = (name = "document.pdf") =>
  String(name)
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 140) || "document.pdf";

const toPublicUrl = (key) => {
  const raw = String(process.env.R2_PUBLIC_URL || "").trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = new URL(withProtocol);

  const bucket = getR2Bucket();
  const normalizedKey = normalizeObjectKey(key);
  const encodedKey = encodeObjectKey(normalizedKey);

  if (!encodedKey) return parsed.toString().replace(/\/+$/, "");

  const isR2DevHost = /\.r2\.dev$/i.test(parsed.hostname);
  if (isR2DevHost) return `${parsed.origin}/${encodedKey}`;

  const pathPrefix = parsed.pathname.replace(/\/+$/, "");
  if (pathPrefix) return `${parsed.origin}${pathPrefix}/${encodedKey}`;

  const isAccountApiEndpoint = /\.r2\.cloudflarestorage\.com$/i.test(parsed.hostname);
  const hasBucketAsSubdomain = parsed.hostname.toLowerCase().startsWith(`${bucket.toLowerCase()}.`);
  if (isAccountApiEndpoint && !hasBucketAsSubdomain) {
    return `${parsed.origin}/${encodeURIComponent(bucket)}/${encodedKey}`;
  }

  return `${parsed.origin}/${encodedKey}`;
};

const ensureR2Config = () => {
  const missing = [];
  if (!process.env.R2_ENDPOINT) missing.push("R2_ENDPOINT");
  if (!process.env.R2_ACCESS_KEY) missing.push("R2_ACCESS_KEY");
  if (!process.env.R2_SECRET_KEY) missing.push("R2_SECRET_KEY");
  if (!process.env.R2_PUBLIC_URL) missing.push("R2_PUBLIC_URL");

  if (missing.length) {
    const err = new Error(`R2 config missing: ${missing.join(", ")}`);
    err.status = 500;
    throw err;
  }
};

export const validateCompanyDocumentPayload = ({
  fileName,
  contentType,
  fileSize,
  documentType,
}) => {
  if (!fileName || !contentType || !documentType) {
    return { ok: false, message: "fileName, contentType and documentType are required" };
  }

  if (!ALLOWED_DOCUMENT_TYPES.has(documentType)) {
    return { ok: false, message: "Unsupported documentType" };
  }

  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return { ok: false, message: "Unsupported file type. Only PDF is allowed" };
  }

  if (fileSize && Number(fileSize) > MAX_FILE_SIZE_BYTES) {
    return { ok: false, message: "File too large" };
  }

  return { ok: true };
};

export const createCompanyDocumentUploadSignedUrl = async ({
  organizationId,
  documentType,
  fileName,
  contentType,
}) => {
  ensureR2Config();

  const orgId = String(organizationId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(orgId)) {
    const err = new Error("Invalid organization ID");
    err.status = 400;
    throw err;
  }

  const safeName = sanitizeFileName(fileName);
  const unique = crypto.randomUUID();
  const key = `company-documents/${orgId}/${documentType}/${Date.now()}-${unique}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: getR2Bucket(),
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 60 * 5 });

  return {
    uploadUrl,
    key,
    bucket: getR2Bucket(),
    fileUrl: toPublicUrl(key),
    expiresIn: 300,
  };
};

export const createCompanyDocumentRecord = async ({
  organizationId,
  user,
  key,
  fileName,
  contentType,
  fileSize,
  documentType,
}) => {
  const orgId = String(organizationId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(orgId)) {
    const err = new Error("Invalid organization ID");
    err.status = 400;
    throw err;
  }

  if (!key || !key.startsWith(`company-documents/${orgId}/${documentType}/`)) {
    const err = new Error("Invalid file key for this organization/document type");
    err.status = 400;
    throw err;
  }

  return await CompanyDocument.create({
    organization_id: organizationId,
    document_type: documentType,
    uploaded_by: user?._id,
    uploaded_by_role: user?.role === "admin" ? "accountant" : "user",
    original_file_name: fileName,
    display_file_name: fileName,
    bucket: getR2Bucket(),
    key,
    url: toPublicUrl(key),
    content_type: contentType,
    file_size: Number(fileSize || 0),
  });
};

export const listCompanyDocuments = async ({ organizationId, documentType }) => {
  const match = {
    organization_id: organizationId,
    is_active: true,
  };

  if (documentType && ALLOWED_DOCUMENT_TYPES.has(documentType)) {
    match.document_type = documentType;
  }

  const docs = await CompanyDocument.find(match)
    .sort({ createdAt: -1 })
    .populate("uploaded_by", "fullName email")
    .lean();

  return docs.map((doc) => ({
    ...doc,
    url: doc?.key ? toPublicUrl(doc.key) : doc?.url,
  }));
};
