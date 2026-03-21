import mongoose from "mongoose";
import { ComplianceTicket } from "../../models/compliance/complianceTicketModel.js";
import { Organization } from "../../models/organizationModel.js";
import { calculateOrganizationHealth } from "./healthEngine.js";
import { CompanyComplianceProfile } from "../../models/compliance/companyComplianceProfileModel.js";
import { BankReconQuery } from "../../models/bankReconQueryModel.js";
import { RawZohoBankTransaction } from "../../models/raw/rawZohoBankTransactionModel.js";

const pickFirst = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "object" && value) return value;
  }
  return null;
};

const extractAmount = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return null;
};




export const fetchOrganizationSummary = async (orgId) => {
  if (!mongoose.Types.ObjectId.isValid(orgId)) {
    throw new Error("Invalid organization ID");
  }

  const today = new Date();
  const next7Days = new Date();
  next7Days.setDate(today.getDate() + 7);

  const pipeline = [
    {
      $match: {
        organization_id: new mongoose.Types.ObjectId(orgId),
      },
    },
    {
      $group: {
        _id: "$organization_id",

        assigned_since: { $min: "$createdAt" },
        last_activity: { $max: "$updatedAt" },

        total_active: {
          $sum: {
            $cond: [
              { $in: ["$status", ["initiated","pending_docs","in_progress","overdue"]] },
              1,
              0,
            ],
          },
        },

        overdue_count: {
          $sum: { $cond: [{ $eq: ["$status", "overdue"] }, 1, 0] },
        },

        pending_docs_count: {
          $sum: { $cond: [{ $eq: ["$status", "pending_docs"] }, 1, 0] },
        },

        filed_count: {
          $sum: { $cond: [{ $eq: ["$status", "filed"] }, 1, 0] },
        },

        closed_count: {
          $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] },
        },

        // Count resolved tickets that were updated (filed/approved) on or before due_date
        filed_on_time_count: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $in: ["$status", ["filed", "approved", "closed"]] },
                  { $lte: ["$updatedAt", "$due_date"] },
                ],
              },
              1,
              0,
            ],
          },
        },

        filed_total_count: {
          $sum: { $cond: [{ $in: ["$status", ["filed", "approved", "closed"]] }, 1, 0] },
        },

        upcoming_7d: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ["$due_date", today] },
                  { $lte: ["$due_date", next7Days] },
                  { $in: ["$status", ["initiated","pending_docs","in_progress"]] },
                ],
              },
              1,
              0,
            ],
          },
        },

        tickets: {
          $push: {
            status: "$status",
            due_date: "$due_date",
            updatedAt: "$updatedAt",
            category_tag: "$category_tag",
            createdAt: "$createdAt",
          },
        },
      },
    },
  ];

  const result = await ComplianceTicket.aggregate(pipeline);

  if (!result.length) {
    throw new Error("No tickets found for this organization");
  }

  const orgStats = result[0];

  // Fetch organization basic info
  const org = await Organization.findById(orgId).lean();
  const profile = await CompanyComplianceProfile.findOne({ organization_id: orgId }).lean();

  if (!org) {
    throw new Error("Organization not found");
  }

  // Calculate health using your strict engine
  const health = calculateOrganizationHealth(orgStats.tickets);

  // Filed on time %: resolved tickets where updatedAt <= due_date
  const filed_on_time_pct =
    orgStats.filed_total_count > 0
      ? Math.round((orgStats.filed_on_time_count / orgStats.filed_total_count) * 100)
      : null;

  return {
    organization_id: orgId,
    organization_name: org.name,
    cin: profile?.cin || profile?.llpin || org.cin || null,
    llpin: profile?.llpin || null,
    total_active: orgStats.total_active,
    overdue_count: orgStats.overdue_count,
    upcoming_7d: orgStats.upcoming_7d,
    pending_docs_count: orgStats.pending_docs_count,
    filed_count: orgStats.filed_count,
    closed_count: orgStats.closed_count,
    filed_on_time_pct,
    health_score: health.health_score,
    health_status: health.health_status,
    assigned_since: orgStats.assigned_since,
    last_activity: orgStats.last_activity,
  };
};




// services/accountantOrgDetail.service.js


export const fetchOrganizationTickets = async (orgId, query) => {
  let {
    status = "ongoing",
    category = "all",
    ticket_status = "all",
    sort_by = "due_date",
    page = 1,
    limit = 10,
  } = query;

  page = Math.max(1, parseInt(page));
  limit = Math.min(100, Math.max(1, parseInt(limit)));

  const match = {
    organization_id: orgId,
  };

  // Ongoing vs Closed filter
  if (status === "ongoing") {
    match.status = {
      $in: ["initiated", "pending_docs", "in_progress", "overdue"],
    };
  } else if (status === "closed") {
    match.status = {
      $in: ["closed", "approved", "filed"],
    };
  }

  // Category filter
  if (category !== "all") {
    match.category_tag = category;
  }

  // Specific ticket status filter
  if (ticket_status !== "all") {
    match.status = ticket_status;
  }

  const sortMap = {
    due_date: { due_date: 1 },
    status: { status: 1 },
    category: { category_tag: 1 },
    updated_at: { updatedAt: -1 },
  };

  const sortStage = sortMap[sort_by] || { due_date: 1 };

  const total = await ComplianceTicket.countDocuments(match);

  const tickets = await ComplianceTicket.find(match)
    .sort(sortStage)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
    data: tickets.map((t) => ({
      ticket_id: t._id,
      subtag: t.subtag,
      form_description: t.subtag,
      category_tag: t.category_tag,
      financial_year: t.financial_year,
      status: t.status,
      due_date: t.due_date,
      last_activity: t.updatedAt,
      has_client_update: false, // replace when client update system exists
    })),
  };
};




export const fetchOrganizationCompanyProfile = async (orgId) => {
  const profile = await CompanyComplianceProfile.findOne({
    organization_id: orgId,
  }).lean();

  if (!profile) return null;

  return {
    organization_id: profile.organization_id,
    company_name: profile.company_name || null,
    company_type: profile.company_type,
    cin: profile.cin || profile.llpin || null,
    llpin: profile.llpin || null,
    gstin: profile.gstin,
    pan: profile.pan,
    tan: profile.tan,
    date_of_incorporation: profile.date_of_incorporation,
    registered_office_address: profile.registered_office_address,
    authorized_capital: profile.authorized_capital,
    paid_up_capital: profile.paid_up_capital,
    mca_status: profile.mca_status,
  };
};

export const fetchOrganizationReconciliationQueries = async (orgId) => {
  if (!mongoose.Types.ObjectId.isValid(orgId)) {
    throw new Error("Invalid organization ID");
  }

  const queries = await BankReconQuery.find({
    organizationId: orgId,
    status: true,
  })
    .sort({ createdAt: -1 })
    .lean();

  const zohoIds = queries
    .map((q) => q.transactionDetails?.zohoTransactionId)
    .filter(Boolean);

  const raws = zohoIds.length
    ? await RawZohoBankTransaction.find({
        organizationId: orgId,
        zohoTransactionId: { $in: zohoIds },
      }).lean()
    : [];

  const rawMap = new Map(raws.map((r) => [r.zohoTransactionId, r.payload || {}]));

  const enriched = queries.map((q) => {
    const details = { ...(q.transactionDetails || {}) };
    const payload = rawMap.get(details.zohoTransactionId) || {};

    const categoryCandidate = pickFirst(
      payload.category_name,
      payload.transaction_type_formatted,
      payload.transaction_type_name,
      payload.category,
      payload.transaction_category,
      payload.transaction_type,
      payload.expense_type,
      payload.payment_type,
      payload.entry_type
    );

    let normalizedCategory =
      typeof categoryCandidate === "string" && !["debit", "credit"].includes(categoryCandidate.toLowerCase())
        ? categoryCandidate
        : null;

    const normalizedTxnType = String(
      pickFirst(payload.transaction_type, payload.transaction_type_formatted, payload.transaction_category) || ""
    )
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .trim();

    if (details.type === "debit") {
      if (normalizedTxnType === "vendor payment") {
        normalizedCategory = "Vendor Payment";
      } else if (normalizedTxnType === "vendor advance") {
        normalizedCategory = "Vendor Advance";
      } else if (normalizedTxnType === "customer payment") {
        normalizedCategory = "Vendor Advance";
      }
    }

    details.zohoCategory = details.zohoCategory ?? normalizedCategory;
    details.expenseAccount = details.expenseAccount ?? pickFirst(
      payload.offset_account_name,
      payload.offset_account,
      payload.expense_account_name,
      payload.expense_account,
      payload.expense_account_id,
      payload.rule_details?.offset_account_name
    );
    details.vendor = details.vendor ?? pickFirst(
      payload.vendor_name,
      payload.payee_name,
      payload.payee,
      payload.vendor,
      payload.contact_name
    );
    details.customer = details.customer ?? pickFirst(
      payload.customer_name,
      payload.customer,
      payload.contact_name
    );
    details.accountName = details.accountName ?? pickFirst(
      payload.account_name,
      payload.bank_account_name,
      payload.to_account_name,
      payload.deposit_to_account_name,
      payload.destination_account_name
    );
    details.offsetAccountName = details.offsetAccountName ?? pickFirst(
      payload.offset_account_name,
      payload.offset_account,
      payload.from_account_name,
      payload.source_account_name,
      payload.rule_details?.offset_account_name,
      payload.rule_details?.from_account_name
    );
    details.fromAccount = details.fromAccount ?? pickFirst(
      payload.from_account_name,
      payload.source_account_name,
      payload.paid_through_account_name,
      payload.paid_through,
      payload.from_account,
      payload.account_name,
      payload.bank_account_name,
      payload.rule_details?.from_account_name
    );
    details.toAccount = details.toAccount ?? pickFirst(
      payload.to_account_name,
      payload.destination_account_name,
      payload.deposit_to_account_name,
      payload.deposit_to,
      payload.to_account,
      payload.offset_account_name,
      payload.offset_account,
      payload.rule_details?.to_account_name,
      payload.rule_details?.offset_account_name
    );
    details.paymentNumber = details.paymentNumber ?? pickFirst(
      payload.payment_number,
      payload.refund_payment_number,
      payload.refund_against_payment_number,
      payload.payment?.payment_number
    );
    details.selectedPaymentAmount = details.selectedPaymentAmount ?? extractAmount(
      payload.refund_payment_amount,
      payload.payment_amount,
      payload.amount_applied,
      payload.amount_to_refund,
      payload.payment?.amount
    );
    details.zohoDescription = details.zohoDescription ?? pickFirst(
      payload.description,
      payload.memo,
      payload.narration,
      payload.notes
    );

    return {
      ...q,
      transactionDetails: details,
    };
  });

  return {
    total: enriched.length,
    data: enriched,
  };
};

export const resolveOrganizationReconciliationQuery = async ({ orgId, queryId, resolvedBy }) => {
  if (!mongoose.Types.ObjectId.isValid(orgId)) {
    throw new Error("Invalid organization ID");
  }

  if (!mongoose.Types.ObjectId.isValid(queryId)) {
    throw new Error("Invalid query ID");
  }

  const updated = await BankReconQuery.findOneAndUpdate(
    {
      _id: queryId,
      organizationId: orgId,
      status: true,
    },
    {
      $set: {
        status: false,
        resolvedAt: new Date(),
        resolvedBy: resolvedBy || null,
      },
    },
    { returnDocument: "after" }
  ).lean();

  return updated;
};