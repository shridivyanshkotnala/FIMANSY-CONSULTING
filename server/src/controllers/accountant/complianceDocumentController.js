import mongoose from "mongoose";
import { ComplianceDocument } from "../../models/compliance/complianceDocumentModel.js";
import {
  ensureUploadPayload,
  getTicketOrThrow,
  assertTicketAccess,
  createDocumentUploadSignedUrl,
  createComplianceDocumentRecord,
  listTicketDocumentsService,
  markFinalVerifiedDocumentService,
} from "../../services/compliance/complianceDocumentService.js";

const handleError = (res, error, fallback = "Server error") => {
  console.error("complianceDocumentController error:", error);
  const status = error?.status || 500;
  return res.status(status).json({ message: error?.message || fallback });
};

export const initTicketDocumentUpload = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { fileName, contentType, fileSize, intent = "working_doc" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }

    const valid = ensureUploadPayload({ fileName, contentType, fileSize });
    if (!valid.ok) {
      return res.status(400).json({ message: valid.message });
    }

    const ticket = await getTicketOrThrow(ticketId);
    assertTicketAccess({ ticket, user: req.user, requireAccountant: true });

    const payload = await createDocumentUploadSignedUrl({
      ticket,
      fileName,
      contentType,
      fileSize,
      uploadedBy: req.user._id,
      uploadedByRole: req.user.role,
      intent,
    });

    return res.status(200).json({ message: "Upload URL generated", data: payload });
  } catch (error) {
    return handleError(res, error, "Failed to initialize upload");
  }
};

export const completeTicketDocumentUpload = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const {
      key,
      fileName,
      contentType,
      fileSize,
      intent = "working_doc",
      message,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }

    if (!key || !fileName || !contentType) {
      return res
        .status(400)
        .json({ message: "key, fileName and contentType are required" });
    }

    const ticket = await getTicketOrThrow(ticketId);
    assertTicketAccess({ ticket, user: req.user, requireAccountant: true });

    const document = await createComplianceDocumentRecord({
      ticket,
      user: req.user,
      key,
      fileName,
      contentType,
      fileSize,
      intent,
      message,
    });

    return res.status(201).json({ message: "Document uploaded", data: document });
  } catch (error) {
    return handleError(res, error, "Failed to complete upload");
  }
};

export const listTicketDocuments = async (req, res) => {
  try {
    const { ticketId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }

    const ticket = await getTicketOrThrow(ticketId);
    assertTicketAccess({ ticket, user: req.user, requireAccountant: true });

    const docs = await listTicketDocumentsService(ticketId);

    return res.status(200).json({ total: docs.length, data: docs });
  } catch (error) {
    return handleError(res, error, "Failed to fetch documents");
  }
};

export const markTicketDocumentFinalVerified = async (req, res) => {
  try {
    const { ticketId, documentId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(ticketId) ||
      !mongoose.Types.ObjectId.isValid(documentId)
    ) {
      return res.status(400).json({ message: "Invalid ticket/document ID" });
    }

    const ticket = await getTicketOrThrow(ticketId);
    assertTicketAccess({ ticket, user: req.user, requireAccountant: true });

    const document = await ComplianceDocument.findOne({
      _id: documentId,
      ticket_id: ticketId,
      is_active: true,
    });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const updated = await markFinalVerifiedDocumentService({
      ticket,
      document,
      verifier: req.user,
    });

    return res.status(200).json({
      message: "Final verified document marked",
      data: updated,
    });
  } catch (error) {
    return handleError(res, error, "Failed to mark final verified document");
  }
};
