import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "../r2Client.js";
import { QueryHubDocument } from "../../models/queryHub/queryHubDocumentModel.js";
import { QueryHubComment } from "../../models/queryHub/queryHubCommentModel.js";
import { QueryHubTicket } from "../../models/queryHub/queryHubTicketModel.js";

const ALLOWED_CONTENT_TYPES = new Set([
  "application/octet-stream",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/csv",
  "application/zip",
]);

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const DEFAULT_R2_BUCKET = "fimansy-documents";

const getR2Bucket = () => String(process.env.R2_BUCKET || DEFAULT_R2_BUCKET).trim();

const encodeObjectKey = (key = "") =>
  String(key)
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");

const toPublicUrl = (key) => {
  const raw = String(process.env.R2_PUBLIC_URL || "").trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = new URL(withProtocol);
  const encodedKey = encodeObjectKey(key);

  if (!encodedKey) {
    return parsed.toString().replace(/\/+$/, "");
  }

  if (/\.r2\.dev$/i.test(parsed.hostname)) {
    return `${parsed.origin}/${encodedKey}`;
  }

  const pathPrefix = parsed.pathname.replace(/\/+$/, "");
  if (pathPrefix) return `${parsed.origin}${pathPrefix}/${encodedKey}`;
  return `${parsed.origin}/${encodedKey}`;
};

const sanitizeFileName = (name = "document") =>
  String(name)
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 140) || "document";

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

const actorToRole = (role) => (role === "admin" || role === "accountant" ? "accountant" : "client");

export const validateUploadPayload = ({ fileName, contentType, fileSize }) => {
  if (!fileName || !contentType) return { ok: false, message: "fileName and contentType are required" };
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) return { ok: false, message: "Unsupported file type" };
  if (fileSize && Number(fileSize) > MAX_FILE_SIZE_BYTES) return { ok: false, message: "File too large" };
  return { ok: true };
};

export const createQueryHubUploadSignedUrl = async ({ ticket, fileName, contentType }) => {
  ensureR2Config();

  const safeName = sanitizeFileName(fileName);
  const unique = crypto.randomUUID();
  const orgId = String(ticket.organization_id);
  const ticketId = String(ticket._id);
  const key = `query-hub/${orgId}/${ticketId}/${Date.now()}-${unique}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: getR2Bucket(),
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });

  return {
    uploadUrl,
    key,
    bucket: getR2Bucket(),
    fileUrl: toPublicUrl(key),
    expiresIn: 300,
  };
};

export const createQueryHubDocumentRecord = async ({ ticket, user, key, fileName, contentType, fileSize, message }) => {
  const role = actorToRole(user?.role);
  const orgId = String(ticket.organization_id);
  const ticketId = String(ticket._id);

  if (!key || !key.startsWith(`query-hub/${orgId}/${ticketId}/`)) {
    const err = new Error("Invalid file key for this ticket");
    err.status = 400;
    throw err;
  }

  const doc = await QueryHubDocument.create({
    ticket_id: ticket._id,
    organization_id: ticket.organization_id,
    uploaded_by: user._id,
    uploaded_by_role: role,
    original_file_name: fileName,
    display_file_name: fileName,
    bucket: getR2Bucket(),
    key,
    url: toPublicUrl(key),
    content_type: contentType,
    file_size: Number(fileSize || 0),
  });

  await QueryHubComment.create({
    ticket_id: ticket._id,
    organization_id: ticket.organization_id,
    user_id: user._id,
    role,
    message: message?.trim() || `${role === "accountant" ? "Accountant" : "Client"} uploaded document: ${doc.display_file_name}`,
    attachments: [doc.url],
  });

  await QueryHubTicket.updateOne(
    { _id: ticket._id },
    {
      $set: {
        last_activity_at: new Date(),
        last_comment_at: new Date(),
        last_comment_by_role: role,
        has_unread_client_update: role === "client",
        has_unread_accountant_update: role === "accountant",
      },
    }
  );

  return doc;
};

export const listQueryHubTicketDocuments = async (ticketId) => {
  const docs = await QueryHubDocument.find({ ticket_id: ticketId, is_active: true })
    .sort({ createdAt: -1 })
    .populate("uploaded_by", "fullName email")
    .lean();

  return docs.map((doc) => ({
    ...doc,
    url: doc?.key ? toPublicUrl(doc.key) : doc?.url,
  }));
};
