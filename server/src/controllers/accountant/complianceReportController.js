import mongoose from "mongoose";
import {
  createComplianceDocumentAccessUrl,
  listFinalVerifiedComplianceLogs,
} from "../../services/compliance/complianceLogsService.js";

const handleError = (res, error, fallback = "Server error") => {
  console.error("complianceReportController error:", error);
  const status = error?.status || 500;
  return res.status(status).json({ message: error?.message || fallback });
};

const isValidOrgId = (value) => value && mongoose.Types.ObjectId.isValid(String(value));

const readListParams = (req) => ({
  financialYear: String(req.query?.financial_year || "").trim() || undefined,
  recurrenceType: String(req.query?.recurrence_type || "").trim() || undefined,
  month: String(req.query?.month || "").trim() || undefined,
  quarter: String(req.query?.quarter || "").trim() || undefined,
  obligationTag: String(req.query?.obligation_tag || "").trim() || undefined,
  page: req.query?.page,
  limit: req.query?.limit,
});

export const getFinalVerifiedDocumentsReport = async (req, res) => {
  try {
    const organizationId = String(req.query?.organization_id || "").trim() || undefined;

    if (organizationId && !isValidOrgId(organizationId)) {
      return res.status(400).json({ message: "Invalid organization_id" });
    }

    const payload = await listFinalVerifiedComplianceLogs({
      organizationId,
      ...readListParams(req),
    });

    return res.status(200).json(payload);
  } catch (error) {
    return handleError(res, error, "Failed to fetch final verified documents report");
  }
};

export const getOrganizationComplianceLogs = async (req, res) => {
  try {
    const organizationId = req.organizationId || req.headers["x-organization-id"];

    if (!isValidOrgId(organizationId)) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    const payload = await listFinalVerifiedComplianceLogs({
      organizationId,
      ...readListParams(req),
    });

    return res.status(200).json(payload);
  } catch (error) {
    return handleError(res, error, "Failed to fetch compliance logs");
  }
};

export const getOrganizationComplianceLogAccessUrl = async (req, res) => {
  try {
    const organizationId = req.organizationId || req.headers["x-organization-id"];
    const { documentId } = req.params;

    if (!isValidOrgId(organizationId) || !mongoose.Types.ObjectId.isValid(String(documentId))) {
      return res.status(400).json({ message: "Invalid organization ID or document ID" });
    }

    const payload = await createComplianceDocumentAccessUrl({
      documentId,
      organizationId,
    });

    return res.status(200).json({ data: payload });
  } catch (error) {
    return handleError(res, error, "Failed to generate compliance document URL");
  }
};
