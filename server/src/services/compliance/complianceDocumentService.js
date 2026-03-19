import crypto from "crypto";
import {
  PutObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "../r2Client.js";
import { ComplianceDocument } from "../../models/compliance/complianceDocumentModel.js";
import { ComplianceTicket } from "../../models/compliance/complianceTicketModel.js";
import { ComplianceComment } from "../../models/compliance/complianceCommentModel.js";
import {
  buildFinalCanonicalName,
  extractExtension,
} from "./complianceDocumentNamingService.js";

const ALLOWED_CONTENT_TYPES = new Set([
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

const sanitizeFileName = (name = "document") =>
  String(name)
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 140) || "document";

const toRole = (rawRole) => {
  if (rawRole === "admin") return "accountant";
  if (rawRole === "accountant") return "accountant";
  return "user";
};

const toPublicUrl = (key) => {
  const raw = String(process.env.R2_PUBLIC_URL || "").trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const base = withProtocol.replace(/\/+$/, "");
  return `${base}/${key}`;
};

const ensureR2Config = () => {
  const missing = [];
  if (!process.env.R2_BUCKET) missing.push("R2_BUCKET");
  if (!process.env.R2_ENDPOINT) missing.push("R2_ENDPOINT");
  if (!process.env.R2_ACCESS_KEY) missing.push("R2_ACCESS_KEY");
  if (!process.env.R2_SECRET_KEY) missing.push("R2_SECRET_KEY");
  if (!process.env.R2_PUBLIC_URL) missing.push("R2_PUBLIC_URL");

  if (missing.length) {
    const err = new Error(`R2 config missing: ${missing.join(", ")}`);
    err.status = 500;
    throw err;
  }

  const endpoint = String(process.env.R2_ENDPOINT || "").trim();
  if (endpoint.includes("<accountid>") || endpoint.includes("{accountid}")) {
    const err = new Error(
      "R2_ENDPOINT is not configured correctly. Replace placeholder with your real Cloudflare account id."
    );
    err.status = 500;
    throw err;
  }

  const rawPublic = String(process.env.R2_PUBLIC_URL || "").trim();
  const withProtocol = /^https?:\/\//i.test(rawPublic)
    ? rawPublic
    : `https://${rawPublic}`;

  try {
    new URL(withProtocol);
  } catch {
    const err = new Error("R2_PUBLIC_URL is invalid");
    err.status = 500;
    throw err;
  }
};

export const ensureUploadPayload = ({ fileName, contentType, fileSize }) => {
  if (!fileName || !contentType) {
    return { ok: false, message: "fileName and contentType are required" };
  }

  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return { ok: false, message: "Unsupported file type" };
  }

  if (fileSize && Number(fileSize) > MAX_FILE_SIZE_BYTES) {
    return { ok: false, message: "File too large" };
  }

  return { ok: true };
};

export const getTicketOrThrow = async (ticketId) => {
  const ticket = await ComplianceTicket.findById(ticketId).lean();
  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }
  return ticket;
};

export const assertTicketAccess = ({ ticket, user, requireAccountant = false }) => {
  if (requireAccountant && user?.role !== "admin") {
    const err = new Error("Admin only");
    err.status = 403;
    throw err;
  }

  if (user?.role === "admin") return;

  const userOrg = String(user?.organization_id || "");
  const ticketOrg = String(ticket.organization_id || "");
  if (!userOrg || !ticketOrg || userOrg !== ticketOrg) {
    const err = new Error("Access denied for this ticket");
    err.status = 403;
    throw err;
  }
};

export const createDocumentUploadSignedUrl = async ({
  ticket,
  fileName,
  contentType,
  fileSize,
  uploadedBy,
  uploadedByRole,
  intent = "working_doc",
}) => {
  ensureR2Config();

  const safeName = sanitizeFileName(fileName);
  const unique = crypto.randomUUID();
  const orgId = String(ticket.organization_id);
  const ticketId = String(ticket._id);

  const folder = intent === "final_verified_return" ? "final" : "exchange";
  const key = `compliance/${orgId}/${ticketId}/${folder}/${Date.now()}-${unique}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 60 * 5 });

  return {
    uploadUrl,
    key,
    bucket: process.env.R2_BUCKET,
    fileUrl: toPublicUrl(key),
    expiresIn: 300,
  };
};

export const createComplianceDocumentRecord = async ({
  ticket,
  user,
  key,
  fileName,
  contentType,
  fileSize,
  intent = "working_doc",
  message,
}) => {
  const role = toRole(user?.role);
  const ticketId = String(ticket._id);
  const orgId = String(ticket.organization_id);

  if (!key || !key.startsWith(`compliance/${orgId}/${ticketId}/`)) {
    const err = new Error("Invalid file key for this ticket");
    err.status = 400;
    throw err;
  }

  const count = await ComplianceDocument.countDocuments({ ticket_id: ticket._id });
  const nextVersion = count + 1;

  const complianceName = ticket.subtag || ticket.compliance_subtype || "compliance-document";

  const doc = await ComplianceDocument.create({
    ticket_id: ticket._id,
    organization_id: ticket.organization_id,
    obligation_id: ticket.obligation_id || null,
    uploaded_by: user._id,
    uploaded_by_role: role,
    original_file_name: fileName,
    display_file_name: fileName,
    stored_file_name: fileName,
    document_kind: intent,
    financial_year: ticket.financial_year || "",
    compliance_obligation_name: complianceName,
    due_date: ticket.due_date,
    bucket: process.env.R2_BUCKET,
    key,
    url: toPublicUrl(key),
    content_type: contentType,
    file_size: Number(fileSize || 0),
    version_no: nextVersion,
    exchange_round: nextVersion,
  });

  const attachmentPayload = {
    document_id: doc._id,
    name: doc.display_file_name,
    url: doc.url,
    key: doc.key,
    content_type: doc.content_type,
    file_size: doc.file_size,
    kind: doc.document_kind,
    is_final_verified: doc.is_final_verified,
  };

  if (message || role === "accountant") {
    await ComplianceComment.create({
      ticket_id: ticket._id,
      organization_id: ticket.organization_id,
      user_id: user._id,
      role,
      message:
        message?.trim() ||
        `${role === "accountant" ? "Accountant" : "Client"} uploaded document: ${doc.display_file_name}`,
      attachments: [attachmentPayload],
    });
  }

  await ComplianceTicket.updateOne(
    { _id: ticket._id },
    {
      $set: {
        last_activity_at: new Date(),
        last_comment_at: new Date(),
        last_comment_by_role: role,
        has_unread_client_update: role === "user",
        has_unread_accountant_update: role === "accountant",
      },
    }
  );

  return doc;
};

export const listTicketDocumentsService = async (ticketId) => {
  const docs = await ComplianceDocument.find({ ticket_id: ticketId, is_active: true })
    .sort({ createdAt: -1 })
    .populate("uploaded_by", "name email")
    .lean();

  return docs;
};

export const markFinalVerifiedDocumentService = async ({
  ticket,
  document,
  verifier,
}) => {
  const existingFinal = await ComplianceDocument.findOne({
    ticket_id: ticket._id,
    is_final_verified: true,
    _id: { $ne: document._id },
  }).lean();

  if (existingFinal) {
    const err = new Error("Final verified document already exists for this ticket");
    err.status = 409;
    throw err;
  }

  const extension = extractExtension(document.original_file_name || document.display_file_name);
  const canonicalName = buildFinalCanonicalName({
    complianceName:
      document.compliance_obligation_name || ticket.subtag || ticket.compliance_subtype || "compliance-document",
    dueDate: ticket.due_date,
    financialYear: ticket.financial_year,
    extension,
  });

  const orgId = String(ticket.organization_id);
  const ticketId = String(ticket._id);
  const finalKey = `compliance/${orgId}/${ticketId}/final/${canonicalName}`;

  if (document.key !== finalKey) {
    await r2.send(
      new CopyObjectCommand({
        Bucket: process.env.R2_BUCKET,
        CopySource: `${process.env.R2_BUCKET}/${document.key}`,
        Key: finalKey,
        ContentType: document.content_type,
        MetadataDirective: "COPY",
      })
    );

    await r2.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: document.key,
      })
    );
  }

  const now = new Date();

  const updated = await ComplianceDocument.findByIdAndUpdate(
    document._id,
    {
      $set: {
        is_final_verified: true,
        final_verified_at: now,
        final_verified_by: verifier._id,
        document_kind: "final_verified_return",
        display_file_name: canonicalName,
        stored_file_name: canonicalName,
        key: finalKey,
        url: toPublicUrl(finalKey),
        compliance_obligation_name:
          document.compliance_obligation_name || ticket.subtag || ticket.compliance_subtype || "compliance-document",
        financial_year: ticket.financial_year || document.financial_year,
        due_date: ticket.due_date || document.due_date,
      },
    },
    { new: true }
  );

  await ComplianceTicket.updateOne(
    { _id: ticket._id },
    {
      $set: {
        final_verified_document_id: updated._id,
        final_verified_at: now,
        final_verified_by: verifier._id,
        last_activity_at: now,
        has_unread_accountant_update: true,
      },
    }
  );

  const attachmentPayload = {
    document_id: updated._id,
    name: updated.display_file_name,
    url: updated.url,
    key: updated.key,
    content_type: updated.content_type,
    file_size: updated.file_size,
    kind: updated.document_kind,
    is_final_verified: true,
  };

  const verificationComment = await ComplianceComment.create({
    ticket_id: ticket._id,
    organization_id: ticket.organization_id,
    user_id: verifier._id,
    role: "accountant",
    message: `Final verified document marked: ${updated.display_file_name}`,
    attachments: [attachmentPayload],
  });

  await ComplianceDocument.updateOne(
    { _id: updated._id },
    { $set: { final_verified_comment_id: verificationComment._id } }
  );

  return updated;
};
