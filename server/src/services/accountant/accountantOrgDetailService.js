import mongoose from "mongoose";
import { ComplianceTicket } from "../../models/compliance/complianceTicketModel.js";
import { Organization } from "../../models/organizationModel.js";
import { calculateOrganizationHealth } from "./healthEngine.js";
import { CompanyComplianceProfile } from "../../models/compliance/companyComplianceProfileModel.js";




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
    cin: org.cin || null,
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
    cin: profile.cin,
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