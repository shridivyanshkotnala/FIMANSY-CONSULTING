import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import mongoose from "mongoose";
import { r2 } from "../r2Client.js";
import { ComplianceDocument } from "../../models/compliance/complianceDocumentModel.js";

const DEFAULT_R2_BUCKET = "fimansy-documents";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 20;

const MONTH_OPTIONS = [
  { value: "april", month: 4, label: "April" },
  { value: "may", month: 5, label: "May" },
  { value: "june", month: 6, label: "June" },
  { value: "july", month: 7, label: "July" },
  { value: "august", month: 8, label: "August" },
  { value: "september", month: 9, label: "September" },
  { value: "october", month: 10, label: "October" },
  { value: "november", month: 11, label: "November" },
  { value: "december", month: 12, label: "December" },
  { value: "january", month: 1, label: "January" },
  { value: "february", month: 2, label: "February" },
  { value: "march", month: 3, label: "March" },
];

const QUARTER_OPTIONS = {
  q1: { label: "Q1 (Apr-Jun)", months: [4, 5, 6] },
  q2: { label: "Q2 (Jul-Sep)", months: [7, 8, 9] },
  q3: { label: "Q3 (Oct-Dec)", months: [10, 11, 12] },
  q4: { label: "Q4 (Jan-Mar)", months: [1, 2, 3] },
};

const getR2Bucket = () => String(process.env.R2_BUCKET || DEFAULT_R2_BUCKET).trim();

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value || fallback), 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
};

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

const sanitizeFileName = (name = "compliance-document") =>
  String(name)
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 140) || "compliance-document";

const formatComplianceCategory = (value) =>
  String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const buildFinancialYearLabel = (dateLike) => {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return null;

  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const startYear = month <= 3 ? year - 1 : year;
  const endYear = startYear + 1;
  return `${startYear}-${String(endYear).slice(-2)}`;
};

const parseFinancialYearRange = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{4})-(\d{2}|\d{4})$/);
  if (!match) return null;

  const startYear = Number(match[1]);
  const endYear = match[2].length === 2 ? Number(`${String(startYear).slice(0, 2)}${match[2]}`) : Number(match[2]);
  if (!startYear || !endYear || endYear != startYear + 1) return null;

  return {
    start: new Date(Date.UTC(startYear, 3, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(endYear, 2, 31, 23, 59, 59, 999)),
  };
};

const normalizeFinancialYearVariants = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return [];

  const match = raw.match(/^(\d{4})-(\d{2}|\d{4})$/);
  if (!match) return [raw];

  const startYear = Number(match[1]);
  const endYear = match[2].length === 2 ? Number(`${String(startYear).slice(0, 2)}${match[2]}`) : Number(match[2]);
  if (!startYear || !endYear || endYear !== startYear + 1) return [raw];

  const shortFy = `${startYear}-${String(endYear).slice(-2)}`;
  const longFy = `${startYear}-${endYear}`;
  return [shortFy, longFy];
};

const normalizeRecurrenceType = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw || raw === "all") return undefined;
  if (["annual", "annually", "anually", "yearly"].includes(raw)) return "annual";
  if (["monthly", "quarterly", "one_time"].includes(raw)) return raw;
  return undefined;
};

const normalizeMonthNumber = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw || raw === "all") return undefined;

  const matched = MONTH_OPTIONS.find((item) => item.value === raw);
  if (matched) return matched.month;

  const numeric = Number.parseInt(raw, 10);
  if (numeric >= 1 && numeric <= 12) return numeric;
  return undefined;
};

const normalizeQuarterKey = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw || raw === "all") return undefined;
  return Object.hasOwn(QUARTER_OPTIONS, raw) ? raw : undefined;
};

const getFiscalQuarterKey = (dateLike) => {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return null;

  const month = date.getMonth() + 1;
  if ([4, 5, 6].includes(month)) return "q1";
  if ([7, 8, 9].includes(month)) return "q2";
  if ([10, 11, 12].includes(month)) return "q3";
  return "q4";
};

const buildComplianceLogMatch = ({ organizationId, financialYear }) => {
  const match = {
    is_active: { $ne: false },
    is_final_verified: true,
  };

  if (organizationId) {
    const orgIdRaw = String(organizationId).trim();
    match.organization_id = mongoose.Types.ObjectId.isValid(orgIdRaw)
      ? new mongoose.Types.ObjectId(orgIdRaw)
      : orgIdRaw;
  }

  const financialYearVariants = normalizeFinancialYearVariants(financialYear);
  if (financialYearVariants.length) {
    match.financial_year = { $in: financialYearVariants };
  }

  return match;
};

export const listFinalVerifiedComplianceLogs = async ({
  organizationId,
  financialYear,
  recurrenceType,
  month,
  quarter,
  obligationTag,
  page = 1,
  limit = DEFAULT_LIMIT,
}) => {
  const parsedPage = Math.max(parsePositiveInt(page, 1), 1);
  const parsedLimit = Math.min(parsePositiveInt(limit, DEFAULT_LIMIT), MAX_LIMIT);
  const skip = (parsedPage - 1) * parsedLimit;
  const baseMatch = buildComplianceLogMatch({ organizationId, financialYear });
  const normalizedRecurrence = normalizeRecurrenceType(recurrenceType);
  const normalizedMonth = normalizeMonthNumber(month);
  const normalizedQuarter = normalizeQuarterKey(quarter);
  const normalizedObligationTag = String(obligationTag || "").trim().toLowerCase() || undefined;
  const quarterMonths = normalizedQuarter ? QUARTER_OPTIONS[normalizedQuarter].months : undefined;
  const now = new Date();

  const postLookupMatch = {};
  if (normalizedRecurrence) postLookupMatch.recurrence_type = normalizedRecurrence;
  if (normalizedObligationTag) postLookupMatch.compliance_category = normalizedObligationTag;
  if (normalizedRecurrence === "monthly" && normalizedMonth) postLookupMatch.due_month_num = normalizedMonth;
  if (normalizedRecurrence === "quarterly" && quarterMonths) postLookupMatch.due_month_num = { $in: quarterMonths };

  const lookupStages = [
    {
      $lookup: {
        from: "complianceobligations",
        localField: "obligation_id",
        foreignField: "_id",
        as: "obligation",
      },
    },
    { $addFields: { obligation: { $first: "$obligation" } } },
      {
        $lookup: {
          from: "compliancetickets",
          localField: "ticket_id",
          foreignField: "_id",
          as: "ticket",
        },
      },
      { $addFields: { ticket: { $first: "$ticket" } } },
      {
        $lookup: {
          from: "compliancetemplates",
          localField: "obligation.template_id",
          foreignField: "_id",
          as: "template",
        },
      },
      {
        $lookup: {
          from: "compliancetemplates",
          localField: "ticket.template_id",
          foreignField: "_id",
          as: "ticket_template",
        },
      },
      { $addFields: { template: { $first: "$template" } } },
      { $addFields: { ticket_template: { $first: "$ticket_template" } } },
    {
      $addFields: {
          recurrence_type: {
            $ifNull: [
              "$template.recurrence_type",
              {
                $ifNull: [
                  "$ticket_template.recurrence_type",
                  { $ifNull: ["$obligation.recurrence_type", "one_time"] },
                ],
              },
            ],
          },
        compliance_category: {
            $let: {
              vars: {
                rawCategory: {
                  $toLower: {
                    $ifNull: [
                      "$obligation.compliance_category",
                      {
                        $ifNull: [
                          "$obligation.category_tag",
                          {
                            $ifNull: [
                              "$template.compliance_category",
                              {
                                $ifNull: [
                                  "$template.category_tag",
                                  {
                                    $ifNull: [
                                      "$ticket_template.compliance_category",
                                      "$ticket_template.category_tag",
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
              in: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$$rawCategory", "other"] },
                      { $regexMatch: { input: "$$rawCategory", regex: /^mca/i } },
                    ],
                  },
                  "mca",
                  "$$rawCategory",
                ],
              },
            },
        },
        due_month_num: { $month: "$due_date" },
        due_distance: { $abs: { $subtract: ["$due_date", now] } },
      },
    },
  ];

  const matchStages = Object.keys(postLookupMatch).length ? [{ $match: postLookupMatch }] : [];

  const [dataResult, fyOptions, tagOptions] = await Promise.all([
    ComplianceDocument.aggregate([
      { $match: baseMatch },
      ...lookupStages,
      ...matchStages,
      { $sort: { due_distance: 1, due_date: 1, compliance_obligation_name: 1, createdAt: -1 } },
      {
        $facet: {
          rows: [
            { $skip: skip },
            { $limit: parsedLimit },
            {
              $project: {
                _id: 1,
                ticket_id: 1,
                obligation_id: 1,
                original_file_name: 1,
                display_file_name: 1,
                due_date: 1,
                final_verified_at: 1,
                financial_year: 1,
                compliance_obligation_name: 1,
                uploaded_at: 1,
                createdAt: 1,
                key: 1,
                url: 1,
                recurrence_type: 1,
                compliance_category: 1,
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ]),
    ComplianceDocument.aggregate([
      { $match: buildComplianceLogMatch({ organizationId }) },
      {
        $project: {
          financial_year: "$financial_year",
        },
      },
      { $match: { financial_year: { $nin: [null, ""] } } },
      {
        $addFields: {
          fy_start_year: {
            $toInt: {
              $arrayElemAt: [{ $split: ["$financial_year", "-"] }, 0],
            },
          },
        },
      },
      {
        $group: {
          _id: "$financial_year",
          fy_start_year: { $first: "$fy_start_year" },
        },
      },
      { $sort: { fy_start_year: -1, _id: -1 } },
    ]),
    ComplianceDocument.aggregate([
      { $match: buildComplianceLogMatch({ organizationId }) },
      ...lookupStages,
      { $match: { compliance_category: { $nin: [null, ""] } } },
      { $group: { _id: "$compliance_category" } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const rows = dataResult?.[0]?.rows || [];
  const total = dataResult?.[0]?.totalCount?.[0]?.count || 0;

  return {
    data: rows.map((row) => ({
      ...row,
      url: row?.key ? toPublicUrl(row.key) : row?.url,
      financial_year_label: row.financial_year || buildFinancialYearLabel(row.due_date),
      recurrence_label:
        row.recurrence_type === "annual"
          ? "Yearly"
          : row.recurrence_type === "quarterly"
            ? "Quarterly"
            : row.recurrence_type === "monthly"
              ? "Monthly"
              : "One Time",
      compliance_category_label: formatComplianceCategory(row.compliance_category),
      month_label: MONTH_OPTIONS.find((item) => item.month === new Date(row.due_date).getMonth() + 1)?.label || null,
      quarter_key: getFiscalQuarterKey(row.due_date),
      quarter_label: QUARTER_OPTIONS[getFiscalQuarterKey(row.due_date)]?.label || null,
    })),
    total,
    page: parsedPage,
    limit: parsedLimit,
    total_pages: Math.max(1, Math.ceil(total / parsedLimit)),
    filter_options: {
      financial_years: fyOptions.map((entry) => ({
        value: String(entry._id),
        label: String(entry._id),
      })),
      obligation_tags: tagOptions.map((entry) => ({
        value: entry._id,
        label: formatComplianceCategory(entry._id),
      })),
    },
  };
};

export const createComplianceDocumentAccessUrl = async ({ documentId, organizationId }) => {
  ensureR2Config();

  const document = await ComplianceDocument.findOne({
    _id: documentId,
    ...(organizationId ? { organization_id: organizationId } : {}),
    is_active: { $ne: false },
    is_final_verified: true,
  }).lean();

  if (!document) {
    const err = new Error("Compliance document not found");
    err.status = 404;
    throw err;
  }

  const command = new GetObjectCommand({
    Bucket: document.bucket || getR2Bucket(),
    Key: document.key,
    ResponseContentType: document.content_type || undefined,
    ResponseContentDisposition: `inline; filename="${sanitizeFileName(document.display_file_name || document.original_file_name || "compliance-document")}"`,
  });

  const signedUrl = await getSignedUrl(r2, command, { expiresIn: 60 * 5 });

  return {
    signedUrl,
    expiresIn: 300,
    fileName: document.display_file_name || document.original_file_name,
    url: document?.key ? toPublicUrl(document.key) : document?.url,
  };
};
