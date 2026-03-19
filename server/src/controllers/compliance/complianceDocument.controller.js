import mongoose from "mongoose";
import {
  ensureUploadPayload,
  getTicketOrThrow,
  assertTicketAccess,
  createDocumentUploadSignedUrl,
  createComplianceDocumentRecord,
  listTicketDocumentsService,
} from "../../services/compliance/complianceDocumentService.js";

const handleError = (res, error, fallback = "Server error") => {
  const status = error?.status || 500;
  return res.status(status).json({ message: error?.message || fallback });
};

export const initComplianceTicketDocumentUpload = async (req, res) => {
  try {
    const { id: ticketId } = req.params;
    const { fileName, contentType, fileSize, intent = "working_doc" } = req.body;
    const organizationId = req.organizationId || req.headers["x-organization-id"];

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }

    const valid = ensureUploadPayload({ fileName, contentType, fileSize });
    if (!valid.ok) {
      return res.status(400).json({ message: valid.message });
    }

    const ticket = await getTicketOrThrow(ticketId);
    assertTicketAccess({
      ticket,
      user: req.user,
      requireAccountant: false,
      organizationId,
    });

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

export const completeComplianceTicketDocumentUpload = async (req, res) => {
  try {
    const { id: ticketId } = req.params;
    const {
      key,
      fileName,
      contentType,
      fileSize,
      intent = "working_doc",
      message,
    } = req.body;
    const organizationId = req.organizationId || req.headers["x-organization-id"];

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }

    if (!key || !fileName || !contentType) {
      return res
        .status(400)
        .json({ message: "key, fileName and contentType are required" });
    }

    const ticket = await getTicketOrThrow(ticketId);
    assertTicketAccess({
      ticket,
      user: req.user,
      requireAccountant: false,
      organizationId,
    });

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

export const listComplianceTicketDocuments = async (req, res) => {
  try {
    const { id: ticketId } = req.params;
    const organizationId = req.organizationId || req.headers["x-organization-id"];

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }

    const ticket = await getTicketOrThrow(ticketId);
    assertTicketAccess({
      ticket,
      user: req.user,
      requireAccountant: false,
      organizationId,
    });

    const docs = await listTicketDocumentsService(ticketId);

    return res.status(200).json({ total: docs.length, data: docs });
  } catch (error) {
    return handleError(res, error, "Failed to fetch documents");
  }
};
