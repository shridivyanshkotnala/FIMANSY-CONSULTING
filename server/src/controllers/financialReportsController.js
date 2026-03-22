import mongoose from "mongoose";
import {
  createFinancialReportAccessUrl,
  createFinancialReportRecord,
  createFinancialReportUploadSignedUrl,
  listFinancialReports,
  validateFinancialReportPayload,
} from "../services/financialReportsService.js";

const handleError = (res, error, fallback = "Server error") => {
  console.error("financialReportsController error:", error);
  const status = error?.status || 500;
  return res.status(status).json({ message: error?.message || fallback });
};

const validateOrgId = (organizationId) =>
  organizationId && mongoose.Types.ObjectId.isValid(String(organizationId));

const readListParams = (req) => ({
  reportType: String(req.query?.type || "").trim() || undefined,
  customTag: String(req.query?.tag || "").trim() || undefined,
  search: String(req.query?.search || "").trim() || undefined,
  periodStart: String(req.query?.period_start || "").trim() || undefined,
  periodEnd: String(req.query?.period_end || "").trim() || undefined,
  page: req.query?.page,
  limit: req.query?.limit,
});

export const listOrganizationFinancialReports = async (req, res) => {
  try {
    const organizationId = req.organizationId || req.headers["x-organization-id"];

    if (!validateOrgId(organizationId)) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    const payload = await listFinancialReports({
      organizationId,
      ...readListParams(req),
    });

    return res.status(200).json(payload);
  } catch (error) {
    return handleError(res, error, "Failed to fetch financial reports");
  }
};

export const getOrganizationFinancialReportAccessUrl = async (req, res) => {
  try {
    const organizationId = req.organizationId || req.headers["x-organization-id"];
    const { reportId } = req.params;

    if (!validateOrgId(organizationId) || !mongoose.Types.ObjectId.isValid(String(reportId))) {
      return res.status(400).json({ message: "Invalid organization ID or report ID" });
    }

    const payload = await createFinancialReportAccessUrl({ reportId, organizationId });
    return res.status(200).json({ data: payload });
  } catch (error) {
    return handleError(res, error, "Failed to generate signed view URL");
  }
};

export const initAccountantFinancialReportUpload = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { fileName, contentType, fileSize, reportType, periodStart, periodEnd, customTags } = req.body;

    if (!validateOrgId(orgId)) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    const valid = validateFinancialReportPayload({
      fileName,
      contentType,
      fileSize,
      reportType,
      periodStart,
      periodEnd,
      customTags,
    });

    if (!valid.ok) {
      return res.status(400).json({ message: valid.message });
    }

    const payload = await createFinancialReportUploadSignedUrl({
      organizationId: orgId,
      reportType,
      fileName,
      contentType,
    });

    return res.status(200).json({ message: "Upload URL generated", data: payload });
  } catch (error) {
    return handleError(res, error, "Failed to initialize financial report upload");
  }
};

export const completeAccountantFinancialReportUpload = async (req, res) => {
  try {
    const { orgId } = req.params;
    const {
      key,
      fileName,
      contentType,
      fileSize,
      reportType,
      periodStart,
      periodEnd,
      customTags,
    } = req.body;

    if (!validateOrgId(orgId)) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    const valid = validateFinancialReportPayload({
      fileName,
      contentType,
      fileSize,
      reportType,
      periodStart,
      periodEnd,
      customTags,
    });

    if (!valid.ok) {
      return res.status(400).json({ message: valid.message });
    }

    if (!key) {
      return res.status(400).json({ message: "key is required" });
    }

    const document = await createFinancialReportRecord({
      organizationId: orgId,
      user: req.user,
      key,
      fileName,
      contentType,
      fileSize,
      reportType,
      periodStart,
      periodEnd,
      customTags: valid.customTags,
    });

    return res.status(201).json({ message: "Financial report uploaded", data: document });
  } catch (error) {
    return handleError(res, error, "Failed to complete financial report upload");
  }
};

export const listAccountantOrganizationFinancialReports = async (req, res) => {
  try {
    const { orgId } = req.params;

    if (!validateOrgId(orgId)) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    const payload = await listFinancialReports({
      organizationId: orgId,
      ...readListParams(req),
    });

    return res.status(200).json(payload);
  } catch (error) {
    return handleError(res, error, "Failed to fetch financial reports");
  }
};

export const getAccountantFinancialReportAccessUrl = async (req, res) => {
  try {
    const { orgId, reportId } = req.params;

    if (!validateOrgId(orgId) || !mongoose.Types.ObjectId.isValid(String(reportId))) {
      return res.status(400).json({ message: "Invalid organization ID or report ID" });
    }

    const payload = await createFinancialReportAccessUrl({ reportId, organizationId: orgId });
    return res.status(200).json({ data: payload });
  } catch (error) {
    return handleError(res, error, "Failed to generate signed view URL");
  }
};
