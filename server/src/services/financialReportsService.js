import crypto from "crypto";
import mongoose from "mongoose";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "./r2Client.js";
import { FinancialReport } from "../models/financialReportsModel.js";

const ALLOWED_CONTENT_TYPES = new Set(["application/pdf", "application/octet-stream"]);
const ALLOWED_REPORT_TYPES = new Set(["profit_and_loss", "balance_sheet", "cashflow_statement", "other"]);
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const DEFAULT_R2_BUCKET = "fimansy-documents";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 20;

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

const sanitizeFileName = (name = "financial-report.pdf") =>
  String(name)
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 140) || "financial-report.pdf";

const normalizeDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const normalizeCustomTags = (value) => {
  if (!value) return [];

  const source = Array.isArray(value) ? value : String(value).split(",");
  return [...new Set(source
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 12))];
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value || fallback), 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
};

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

export const validateFinancialReportPayload = ({
  fileName,
  contentType,
  fileSize,
  reportType,
  periodStart,
  periodEnd,
  customTags,
}) => {
  if (!fileName || !contentType || !reportType || !periodStart || !periodEnd) {
    return {
      ok: false,
      message: "fileName, contentType, reportType, periodStart and periodEnd are required",
    };
  }

  if (!ALLOWED_REPORT_TYPES.has(reportType)) {
    return { ok: false, message: "Unsupported reportType" };
  }

  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return { ok: false, message: "Unsupported file type. Only PDF is allowed" };
  }

  if (fileSize && Number(fileSize) > MAX_FILE_SIZE_BYTES) {
    return { ok: false, message: "File too large" };
  }

  const startDate = normalizeDate(periodStart);
  const endDate = normalizeDate(periodEnd);
  if (!startDate || !endDate) {
    return { ok: false, message: "Invalid periodStart or periodEnd" };
  }

  if (startDate > endDate) {
    return { ok: false, message: "periodStart cannot be after periodEnd" };
  }

  const tags = normalizeCustomTags(customTags);
  if (reportType === "other" && tags.length === 0) {
    return { ok: false, message: "At least one custom tag is required for other reports" };
  }

  return { ok: true, customTags: tags, startDate, endDate };
};

export const createFinancialReportUploadSignedUrl = async ({
  organizationId,
  reportType,
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
  const key = `financial-reports/${orgId}/${reportType}/${Date.now()}-${unique}-${safeName}`;

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

export const createFinancialReportRecord = async ({
  organizationId,
  user,
  key,
  fileName,
  contentType,
  fileSize,
  reportType,
  periodStart,
  periodEnd,
  customTags,
}) => {
  const orgId = String(organizationId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(orgId)) {
    const err = new Error("Invalid organization ID");
    err.status = 400;
    throw err;
  }

  if (!key || !key.startsWith(`financial-reports/${orgId}/${reportType}/`)) {
    const err = new Error("Invalid file key for this organization/report type");
    err.status = 400;
    throw err;
  }

  const customTagList = normalizeCustomTags(customTags);

  return FinancialReport.create({
    organization_id: organizationId,
    report_type: reportType,
    custom_tags: customTagList,
    period_start: normalizeDate(periodStart),
    period_end: normalizeDate(periodEnd),
    uploaded_at: new Date(),
    uploaded_by: user?._id,
    uploaded_by_role: user?.role === "admin" ? "accountant" : user?.role || "user",
    original_file_name: fileName,
    display_file_name: fileName,
    bucket: getR2Bucket(),
    key,
    url: toPublicUrl(key),
    content_type: contentType,
    file_size: Number(fileSize || 0),
  });
};

export const listFinancialReports = async ({
  organizationId,
  reportType,
  customTag,
  search,
  periodStart,
  periodEnd,
  page = 1,
  limit = DEFAULT_LIMIT,
}) => {
  const parsedPage = parsePositiveInt(page, 1);
  const parsedLimit = Math.min(parsePositiveInt(limit, DEFAULT_LIMIT), MAX_LIMIT);
  const skip = (parsedPage - 1) * parsedLimit;

  const baseMatch = {
    organization_id: organizationId,
    is_active: true,
  };

  const startDate = periodStart ? normalizeDate(periodStart) : null;
  const endDate = periodEnd ? normalizeDate(periodEnd) : null;

  if (startDate || endDate) {
    baseMatch.period_start = {};
    if (startDate) baseMatch.period_start.$gte = startDate;
    if (endDate) baseMatch.period_start.$lte = endDate;
  }

  if (search) {
    baseMatch.$or = [
      { display_file_name: { $regex: search, $options: "i" } },
      { original_file_name: { $regex: search, $options: "i" } },
      { custom_tags: { $elemMatch: { $regex: search, $options: "i" } } },
    ];
  }

  if (customTag) {
    baseMatch.custom_tags = { $in: [String(customTag).trim()] };
  }

  const match = { ...baseMatch };
  if (reportType && ALLOWED_REPORT_TYPES.has(reportType)) {
    match.report_type = reportType;
  }

  const [items, total, summary] = await Promise.all([
    FinancialReport.find(match)
      .sort({ period_end: -1, uploaded_at: -1, createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .populate("uploaded_by", "fullName email")
      .lean(),
    FinancialReport.countDocuments(match),
    FinancialReport.aggregate([
      { $match: baseMatch },
      { $group: { _id: "$report_type", count: { $sum: 1 } } },
    ]),
  ]);

  const summaryMap = {
    profit_and_loss: 0,
    balance_sheet: 0,
    cashflow_statement: 0,
    other: 0,
  };
  for (const entry of summary) {
    if (entry?._id && Object.hasOwn(summaryMap, entry._id)) {
      summaryMap[entry._id] = entry.count;
    }
  }

  return {
    data: items.map((item) => ({
      ...item,
      url: item?.key ? toPublicUrl(item.key) : item?.url,
    })),
    total,
    page: parsedPage,
    limit: parsedLimit,
    total_pages: Math.max(1, Math.ceil(total / parsedLimit)),
    summary: summaryMap,
  };
};

export const createFinancialReportAccessUrl = async ({ reportId, organizationId }) => {
  ensureR2Config();

  const report = await FinancialReport.findOne({
    _id: reportId,
    organization_id: organizationId,
    is_active: true,
  }).lean();

  if (!report) {
    const err = new Error("Financial report not found");
    err.status = 404;
    throw err;
  }

  const command = new GetObjectCommand({
    Bucket: report.bucket || getR2Bucket(),
    Key: report.key,
    ResponseContentType: report.content_type || "application/pdf",
    ResponseContentDisposition: `inline; filename=\"${sanitizeFileName(report.display_file_name || report.original_file_name)}\"`,
  });

  const signedUrl = await getSignedUrl(r2, command, { expiresIn: 60 * 10 });

  return {
    id: String(report._id),
    signedUrl,
    expiresIn: 600,
    fileName: report.display_file_name || report.original_file_name,
  };
};
