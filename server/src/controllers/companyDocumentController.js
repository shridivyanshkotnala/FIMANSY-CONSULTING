import mongoose from "mongoose";
import {
  validateCompanyDocumentPayload,
  createCompanyDocumentUploadSignedUrl,
  createCompanyDocumentRecord,
  listCompanyDocuments,
} from "../services/companyDocumentService.js";

const handleError = (res, error, fallback = "Server error") => {
  console.error("companyDocumentController error:", error);
  const status = error?.status || 500;
  return res.status(status).json({ message: error?.message || fallback });
};

export const initCompanyDocumentUpload = async (req, res) => {
  try {
    const organizationId = req.organizationId || req.headers["x-organization-id"];
    const { fileName, contentType, fileSize, documentType } = req.body;

    if (!organizationId || !mongoose.Types.ObjectId.isValid(String(organizationId))) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    const valid = validateCompanyDocumentPayload({
      fileName,
      contentType,
      fileSize,
      documentType,
    });
    if (!valid.ok) {
      return res.status(400).json({ message: valid.message });
    }

    const payload = await createCompanyDocumentUploadSignedUrl({
      organizationId,
      documentType,
      fileName,
      contentType,
    });

    return res.status(200).json({ message: "Upload URL generated", data: payload });
  } catch (error) {
    return handleError(res, error, "Failed to initialize upload");
  }
};

export const completeCompanyDocumentUpload = async (req, res) => {
  try {
    const organizationId = req.organizationId || req.headers["x-organization-id"];
    const { key, fileName, contentType, fileSize, documentType } = req.body;

    if (!organizationId || !mongoose.Types.ObjectId.isValid(String(organizationId))) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    if (!key || !fileName || !contentType || !documentType) {
      return res.status(400).json({ message: "key, fileName, contentType and documentType are required" });
    }

    const document = await createCompanyDocumentRecord({
      organizationId,
      user: req.user,
      key,
      fileName,
      contentType,
      fileSize,
      documentType,
    });

    return res.status(201).json({ message: "Document uploaded", data: document });
  } catch (error) {
    return handleError(res, error, "Failed to complete upload");
  }
};

export const listOrganizationCompanyDocuments = async (req, res) => {
  try {
    const organizationId = req.organizationId || req.headers["x-organization-id"];
    const documentType = String(req.query?.type || "").trim();

    if (!organizationId || !mongoose.Types.ObjectId.isValid(String(organizationId))) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    const docs = await listCompanyDocuments({ organizationId, documentType });
    return res.status(200).json({ total: docs.length, data: docs });
  } catch (error) {
    return handleError(res, error, "Failed to fetch documents");
  }
};

export const initAccountantCompanyDocumentUpload = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { fileName, contentType, fileSize, documentType } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orgId)) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    const valid = validateCompanyDocumentPayload({
      fileName,
      contentType,
      fileSize,
      documentType,
    });
    if (!valid.ok) {
      return res.status(400).json({ message: valid.message });
    }

    const payload = await createCompanyDocumentUploadSignedUrl({
      organizationId: orgId,
      documentType,
      fileName,
      contentType,
    });

    return res.status(200).json({ message: "Upload URL generated", data: payload });
  } catch (error) {
    return handleError(res, error, "Failed to initialize upload");
  }
};

export const completeAccountantCompanyDocumentUpload = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { key, fileName, contentType, fileSize, documentType } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orgId)) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    if (!key || !fileName || !contentType || !documentType) {
      return res.status(400).json({ message: "key, fileName, contentType and documentType are required" });
    }

    const document = await createCompanyDocumentRecord({
      organizationId: orgId,
      user: req.user,
      key,
      fileName,
      contentType,
      fileSize,
      documentType,
    });

    return res.status(201).json({ message: "Document uploaded", data: document });
  } catch (error) {
    return handleError(res, error, "Failed to complete upload");
  }
};

export const listAccountantOrganizationCompanyDocuments = async (req, res) => {
  try {
    const { orgId } = req.params;
    const documentType = String(req.query?.type || "").trim();

    if (!mongoose.Types.ObjectId.isValid(orgId)) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    const docs = await listCompanyDocuments({ organizationId: orgId, documentType });
    return res.status(200).json({ total: docs.length, data: docs });
  } catch (error) {
    return handleError(res, error, "Failed to fetch documents");
  }
};
