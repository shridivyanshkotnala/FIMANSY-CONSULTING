// services/accountant.service.js
import { ComplianceTicket } from "../../models/compliance/complianceTicketModel.js";
import { calculateOrganizationHealth } from "./healthEngine.js";


export const fetchDashboardMetrics = async () => {
  const aggregation = await ComplianceTicket.aggregate([
    {
      $facet: {
        statusCounts: [
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ],

        avgResolution: [
          {
            $match: {
              status: { $in: ["filed", "approved", "closed"] },
            },
          },
          {
            $project: {
              resolutionDays: {
                $divide: [
                  {
                    $subtract: [
                      // Prefer closed_at (set when status → closed), fall back to updatedAt
                      { $ifNull: ["$closed_at", "$updatedAt"] },
                      "$createdAt",
                    ],
                  },
                  1000 * 60 * 60 * 24,
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              avg: { $avg: "$resolutionDays" },
            },
          },
        ],

        onTimeStats: [
          {
            $match: {
              status: { $in: ["filed", "approved", "closed"] },
            },
          },
          {
            $project: {
              wasOnTime: {
                $cond: [
                  // Prefer closed_at, fall back to updatedAt
                  { $lte: [{ $ifNull: ["$closed_at", "$updatedAt"] }, "$due_date"] },
                  1,
                  0,
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              onTime: { $sum: "$wasOnTime" },
            },
          },
        ],
      },
    },
  ]);

  const statusMap = {
    overdue: 0,
    pending_docs: 0,
    in_progress: 0,
    filed: 0,
    closed: 0,
  };

  aggregation[0].statusCounts.forEach((s) => {
    if (statusMap.hasOwnProperty(s._id)) {
      statusMap[s._id] = s.count;
    }
  });

  const avgResolution =
    aggregation[0].avgResolution[0]?.avg
      ? Number(aggregation[0].avgResolution[0].avg.toFixed(2))
      : null;

  const onTimeData = aggregation[0].onTimeStats[0];

  const onTimePercentage =
    onTimeData && onTimeData.total > 0
      ? Math.round((onTimeData.onTime / onTimeData.total) * 100)
      : null;  // null = no resolved tickets yet; client shows — instead of 100%

  return {
    overdue_count: statusMap.overdue,
    pending_docs_count: statusMap.pending_docs,
    in_progress_count: statusMap.in_progress,
    filed_count: statusMap.filed,
    closed_count: statusMap.closed,
    avg_resolution_days: avgResolution,
    on_time_percentage: onTimePercentage,
  };
};



// services/accountant.service.js


export const fetchOrganizationsSummary = async (query) => {
  let {
    search = "",
    classification = "all",
    sort_by = "overdue",
    page = 1,
    limit = 20,
  } = query;

  page = Math.max(1, parseInt(page));
  limit = Math.min(100, Math.max(1, parseInt(limit)));

  const today = new Date();
  const next7Days = new Date();
  next7Days.setDate(today.getDate() + 7);

  const pipeline = [];

  // ---- LOOKUP ORGANIZATION ----
  pipeline.push(
    {
      $lookup: {
        from: "organizations",
        localField: "organization_id",
        foreignField: "_id",
        as: "org",
      },
    },
    { $unwind: "$org" },
    // Join CompanyComplianceProfile — Organization model has no cin/gstin; those live in CompanyComplianceProfile
    {
      $lookup: {
        from: "companycomplianceprofiles",
        localField: "organization_id",
        foreignField: "organization_id",
        as: "profile",
      },
    },
    { $addFields: { profile: { $arrayElemAt: ["$profile", 0] } } }
  );

  // ---- GLOBAL SEARCH (TICKET + ORG LEVEL) ----
  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { "org.name": { $regex: search, $options: "i" } },
          { "org.cin": { $regex: search, $options: "i" } },
          { "org.gstin": { $regex: search, $options: "i" } },
          { subtag: { $regex: search, $options: "i" } },
          { financial_year: { $regex: search, $options: "i" } },
        ],
      },
    });
  }

  // ---- GROUP BY ORGANIZATION ----
  pipeline.push({
    $group: {
      _id: "$organization_id",

      organization_name: { $first: "$org.name" },
      company_name:      { $first: "$org.name" },      // same source — Organization has no separate legal name field
      cin:               { $first: "$profile.cin" },   // from CompanyComplianceProfile, not Organization
      gstin:             { $first: "$profile.gstin" }, // from CompanyComplianceProfile, not Organization

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
  });

  // ---- CLASSIFICATION FILTER (FIXED) ----
  if (classification === "overdue") {
    pipeline.push({ $match: { overdue_count: { $gt: 0 } } });
  } else if (classification === "upcoming") {
    pipeline.push({ $match: { upcoming_7d: { $gt: 0 } } });
  } else if (classification === "pending_docs") {
    pipeline.push({ $match: { pending_docs_count: { $gt: 0 } } });
  } else if (classification === "no_upcoming") {
    pipeline.push({
      $match: {
        upcoming_7d: 0,
        overdue_count: 0,
      },
    });
  }

  const result = await ComplianceTicket.aggregate(pipeline);

  // ---- HEALTH ENGINE ----
  const enriched = result.map((org) => {
    const health = calculateOrganizationHealth(org.tickets);

    return {
      organization_id: org._id,
      organization_name: org.organization_name,
      company_name: org.company_name || org.organization_name,
      cin:   org.cin   || null,
      gstin: org.gstin || null,
      total_active: org.total_active,
      overdue_count: org.overdue_count,
      upcoming_7d: org.upcoming_7d,
      pending_docs_count: org.pending_docs_count,
      filed_count: org.filed_count,
      closed_count: org.closed_count,
      health_score: health.health_score,
      health_status: health.health_status,
      assigned_since: org.assigned_since,
      last_activity: org.last_activity,
    };
  });

  // ---- SORTING ----
  switch (sort_by) {
    case "overdue":
      enriched.sort((a, b) => b.overdue_count - a.overdue_count);
      break;
    case "upcoming":
      enriched.sort((a, b) => b.upcoming_7d - a.upcoming_7d);
      break;
    case "health":
      enriched.sort((a, b) => a.health_score - b.health_score);
      break;
    case "name":
      enriched.sort((a, b) =>
        a.organization_name.localeCompare(b.organization_name)
      );
      break;
    case "last_activity":
      enriched.sort(
        (a, b) =>
          new Date(b.last_activity) - new Date(a.last_activity)
      );
      break;
    default:
      enriched.sort((a, b) => b.overdue_count - a.overdue_count);
  }

  // ---- PAGINATION ----
  const total = enriched.length;
  const total_pages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = enriched.slice(start, start + limit);

  return {
    total,
    page,
    limit,
    total_pages,
    data: paginated,
  };
};