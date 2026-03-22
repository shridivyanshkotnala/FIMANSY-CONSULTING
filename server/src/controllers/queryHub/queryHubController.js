import mongoose from "mongoose";
import { QueryHubTicket } from "../../models/queryHub/queryHubTicketModel.js";
import { QueryHubComment } from "../../models/queryHub/queryHubCommentModel.js";
import { Organization } from "../../models/organizationModel.js";
import { CompanyComplianceProfile } from "../../models/compliance/companyComplianceProfileModel.js";
import {
  validateUploadPayload,
  createQueryHubUploadSignedUrl,
  createQueryHubDocumentRecord,
  listQueryHubTicketDocuments,
} from "../../services/queryHub/queryHubDocumentService.js";

const toActorRole = (role) => (role === "admin" || role === "accountant" ? "accountant" : "client");

const pickOrgIdFromReq = (req) => req.organizationId || req.headers["x-organization-id"] || req.query?.organization_id;

async function generateQueryNumber() {
  const year = new Date().getFullYear();

  const lastTicket = await QueryHubTicket
    .findOne({ query_number: new RegExp(`^QH-${year}`) })
    .sort({ createdAt: -1 })
    .select("query_number")
    .lean();

  if (!lastTicket?.query_number) return `QH-${year}-00001`;

  const lastNumber = Number(String(lastTicket.query_number).split("-")[2] || 0);
  const next = String(lastNumber + 1).padStart(5, "0");
  return `QH-${year}-${next}`;
}

function buildSubjectFromMessage(message = "") {
  const clean = String(message || "").trim().replace(/\s+/g, " ");
  if (!clean) return "General question for accountant";
  if (clean.length <= 90) return clean;
  return `${clean.slice(0, 87)}...`;
}

function getPagination(req) {
  const page = Math.max(1, Number(req.query?.page || 1));
  const limit = Math.min(50, Math.max(1, Number(req.query?.limit || 10)));
  return { page, limit, skip: (page - 1) * limit };
}

async function getStats(filter = {}) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [openCount, closedThisMonth, avgResolutionResult] = await Promise.all([
    QueryHubTicket.countDocuments({ ...filter, status: "open" }),
    QueryHubTicket.countDocuments({ ...filter, status: "closed", closed_at: { $gte: monthStart } }),
    QueryHubTicket.aggregate([
      { $match: { ...filter, status: "closed", closed_at: { $ne: null } } },
      {
        $project: {
          resolutionMs: { $subtract: ["$closed_at", "$createdAt"] },
        },
      },
      { $match: { resolutionMs: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          avgResolutionMs: { $avg: "$resolutionMs" },
        },
      },
    ]),
  ]);

  const avgResolutionHours = avgResolutionResult?.[0]?.avgResolutionMs
    ? Number((avgResolutionResult[0].avgResolutionMs / (1000 * 60 * 60)).toFixed(2))
    : 0;

  return {
    open_queries: openCount,
    resolved_this_month: closedThisMonth,
    avg_resolution_hours: avgResolutionHours,
  };
}

async function ensureTicketAccessForClient(req, ticketId) {
  const organizationId = pickOrgIdFromReq(req);
  if (!organizationId) {
    const err = new Error("Organization header missing");
    err.status = 400;
    throw err;
  }

  const ticket = await QueryHubTicket.findById(ticketId);
  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }

  if (String(ticket.organization_id) !== String(organizationId)) {
    const err = new Error("Access denied for this ticket");
    err.status = 403;
    throw err;
  }

  return ticket;
}

function handleError(res, error, fallbackMessage = "Server error") {
  const status = error?.status || 500;
  return res.status(status).json({ success: false, message: error?.message || fallbackMessage });
}

async function getMergedCompanyDetails(organizationId) {
  const [organization, profile] = await Promise.all([
    Organization.findById(organizationId)
      .select("name gstin pan tan baseCurrency financialYearStart status createdAt")
      .lean(),
    CompanyComplianceProfile.findOne({ organization_id: organizationId })
      .select("company_type cin llpin date_of_incorporation registered_office_address authorized_capital paid_up_capital mca_status gstin pan tan")
      .lean(),
  ]);

  if (!organization && !profile) return null;

  return {
    name: organization?.name || null,
    gstin: profile?.gstin || organization?.gstin || null,
    pan: profile?.pan || organization?.pan || null,
    tan: profile?.tan || organization?.tan || null,
    company_type: profile?.company_type || null,
    cin: profile?.cin || profile?.llpin || null,
    llpin: profile?.llpin || null,
    date_of_incorporation: profile?.date_of_incorporation || null,
    registered_office_address: profile?.registered_office_address || null,
    authorized_capital: profile?.authorized_capital ?? null,
    paid_up_capital: profile?.paid_up_capital ?? null,
    mca_status: profile?.mca_status || null,
    base_currency: organization?.baseCurrency || "INR",
    financial_year_start: organization?.financialYearStart || null,
    organization_status: organization?.status || null,
    organization_created_at: organization?.createdAt || null,
  };
}

export const getClientQueryHubStats = async (req, res) => {
  try {
    const organizationId = pickOrgIdFromReq(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization header missing" });
    }

    const stats = await getStats({ organization_id: new mongoose.Types.ObjectId(String(organizationId)) });
    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    return handleError(res, error, "Failed to fetch query hub stats");
  }
};

export const getClientQueryHubTickets = async (req, res) => {
  try {
    const organizationId = pickOrgIdFromReq(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization header missing" });
    }

    const status = String(req.query?.status || "open").toLowerCase();
    const effectiveStatus = status === "closed" ? "closed" : "open";

    const { page, limit, skip } = getPagination(req);

    const filter = {
      organization_id: organizationId,
      status: effectiveStatus,
    };

    const [items, total] = await Promise.all([
      QueryHubTicket.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      QueryHubTicket.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: items,
      page,
      limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch tickets");
  }
};

export const createClientQueryHubTicket = async (req, res) => {
  try {
    const organizationId = pickOrgIdFromReq(req);
    const actorRole = toActorRole(req.user?.role || req.role);
    const { message } = req.body || {};

    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization header missing" });
    }

    const cleanMessage = String(message || "").trim();
    if (!cleanMessage) {
      return res.status(400).json({ success: false, message: "message is required" });
    }

    let ticket;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const queryNumber = await generateQueryNumber();
      try {
        ticket = await QueryHubTicket.create({
          organization_id: organizationId,
          query_number: queryNumber,
          subject: buildSubjectFromMessage(cleanMessage),
          message: cleanMessage,
          status: "open",
          created_by: req.user._id,
          last_activity_at: new Date(),
          has_unread_client_update: actorRole === "client",
          has_unread_accountant_update: actorRole === "accountant",
        });
        break;
      } catch (error) {
        const duplicateQueryNo = error?.code === 11000 && error?.keyPattern?.query_number;
        if (duplicateQueryNo && attempt < 3) continue;
        throw error;
      }
    }

    await QueryHubComment.create({
      ticket_id: ticket._id,
      organization_id: organizationId,
      user_id: req.user._id,
      role: actorRole,
      message: cleanMessage,
      attachments: [],
    });

    return res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    return handleError(res, error, "Failed to create ticket");
  }
};

export const getClientQueryHubTicketDetail = async (req, res) => {
  try {
    const ticket = await ensureTicketAccessForClient(req, req.params.ticketId);
    const organization = await getMergedCompanyDetails(ticket.organization_id);

    return res.status(200).json({
      success: true,
      data: {
        ticket,
        organization,
      },
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch ticket");
  }
};

export const getClientQueryHubComments = async (req, res) => {
  try {
    const ticket = await ensureTicketAccessForClient(req, req.params.ticketId);

    const comments = await QueryHubComment.find({ ticket_id: ticket._id })
      .sort({ createdAt: 1 })
      .populate("user_id", "fullName email")
      .lean();

    await QueryHubTicket.updateOne(
      { _id: ticket._id },
      { $set: { has_unread_accountant_update: false } }
    );

    return res.status(200).json({
      success: true,
      data: comments.map((comment) => ({
        ...comment,
        author_role: comment.role,
        author_name: comment.user_id?.fullName || null,
        author_email: comment.user_id?.email || null,
      })),
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch comments");
  }
};

export const postClientQueryHubComment = async (req, res) => {
  try {
    const ticket = await ensureTicketAccessForClient(req, req.params.ticketId);
    const actorRole = toActorRole(req.user?.role || req.role);
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({ success: false, message: "message is required" });
    }

    if (ticket.status === "closed") {
      return res.status(409).json({ success: false, message: "Cannot comment on a closed ticket" });
    }

    const comment = await QueryHubComment.create({
      ticket_id: ticket._id,
      organization_id: ticket.organization_id,
      user_id: req.user._id,
      role: actorRole,
      message,
      attachments: [],
    });

    await QueryHubTicket.updateOne(
      { _id: ticket._id },
      {
        $set: {
          last_activity_at: new Date(),
          last_comment_at: comment.createdAt,
          last_comment_by_role: actorRole,
          has_unread_client_update: actorRole === "client",
          has_unread_accountant_update: actorRole === "accountant",
        },
      }
    );

    return res.status(201).json({ success: true, data: comment });
  } catch (error) {
    return handleError(res, error, "Failed to add comment");
  }
};

export const initClientQueryHubDocumentUpload = async (req, res) => {
  try {
    const ticket = await ensureTicketAccessForClient(req, req.params.ticketId);
    const { fileName, contentType, fileSize } = req.body || {};

    const valid = validateUploadPayload({ fileName, contentType, fileSize });
    if (!valid.ok) {
      return res.status(400).json({ success: false, message: valid.message });
    }

    const payload = await createQueryHubUploadSignedUrl({ ticket, fileName, contentType, fileSize });
    return res.status(200).json({ success: true, data: payload });
  } catch (error) {
    return handleError(res, error, "Failed to initialize upload");
  }
};

export const completeClientQueryHubDocumentUpload = async (req, res) => {
  try {
    const ticket = await ensureTicketAccessForClient(req, req.params.ticketId);
    const { key, fileName, contentType, fileSize, message } = req.body || {};

    if (!key || !fileName || !contentType) {
      return res.status(400).json({ success: false, message: "key, fileName and contentType are required" });
    }

    if (ticket.status === "closed") {
      return res.status(409).json({ success: false, message: "Cannot upload documents to a closed ticket" });
    }

    const document = await createQueryHubDocumentRecord({
      ticket,
      user: req.user,
      key,
      fileName,
      contentType,
      fileSize,
      message,
    });

    return res.status(201).json({ success: true, data: document });
  } catch (error) {
    return handleError(res, error, "Failed to complete upload");
  }
};

export const listClientQueryHubDocuments = async (req, res) => {
  try {
    const ticket = await ensureTicketAccessForClient(req, req.params.ticketId);
    const docs = await listQueryHubTicketDocuments(ticket._id);
    return res.status(200).json({ success: true, data: docs, total: docs.length });
  } catch (error) {
    return handleError(res, error, "Failed to fetch documents");
  }
};

// ============================ Accountant endpoints ============================

async function getTicketForAccountant(ticketId) {
  const ticket = await QueryHubTicket.findById(ticketId);
  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }
  return ticket;
}

export const getAccountantQueryHubStats = async (_req, res) => {
  try {
    const stats = await getStats({});
    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    return handleError(res, error, "Failed to fetch query stats");
  }
};

export const getAccountantQueryHubTickets = async (req, res) => {
  try {
    const status = String(req.query?.status || "open").toLowerCase();
    const effectiveStatus = status === "closed" ? "closed" : "open";
    const organizationId = req.query?.organization_id;
    const { page, limit, skip } = getPagination(req);

    const filter = { status: effectiveStatus };
    if (organizationId && mongoose.Types.ObjectId.isValid(organizationId)) {
      filter.organization_id = organizationId;
    }

    const [items, total] = await Promise.all([
      QueryHubTicket.find(filter)
        .populate("organization_id", "name gstin pan tan")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      QueryHubTicket.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: items,
      page,
      limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch tickets");
  }
};

export const getAccountantQueryHubTicketDetail = async (req, res) => {
  try {
    const ticket = await getTicketForAccountant(req.params.ticketId);
    const organization = await getMergedCompanyDetails(ticket.organization_id);

    return res.status(200).json({ success: true, data: { ticket, organization } });
  } catch (error) {
    return handleError(res, error, "Failed to fetch ticket");
  }
};

export const getAccountantQueryHubComments = async (req, res) => {
  try {
    const ticket = await getTicketForAccountant(req.params.ticketId);

    const comments = await QueryHubComment.find({ ticket_id: ticket._id })
      .sort({ createdAt: 1 })
      .populate("user_id", "fullName email")
      .lean();

    await QueryHubTicket.updateOne(
      { _id: ticket._id },
      { $set: { has_unread_client_update: false } }
    );

    return res.status(200).json({
      success: true,
      data: comments.map((comment) => ({
        ...comment,
        author_role: comment.role,
        author_name: comment.user_id?.fullName || null,
        author_email: comment.user_id?.email || null,
      })),
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch comments");
  }
};

export const postAccountantQueryHubComment = async (req, res) => {
  try {
    const ticket = await getTicketForAccountant(req.params.ticketId);
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({ success: false, message: "message is required" });
    }

    if (ticket.status === "closed") {
      return res.status(409).json({ success: false, message: "Cannot comment on a closed ticket" });
    }

    const comment = await QueryHubComment.create({
      ticket_id: ticket._id,
      organization_id: ticket.organization_id,
      user_id: req.user._id,
      role: "accountant",
      message,
      attachments: [],
    });

    await QueryHubTicket.updateOne(
      { _id: ticket._id },
      {
        $set: {
          last_activity_at: new Date(),
          last_comment_at: comment.createdAt,
          last_comment_by_role: "accountant",
          has_unread_accountant_update: true,
          has_unread_client_update: false,
        },
      }
    );

    return res.status(201).json({ success: true, data: comment });
  } catch (error) {
    return handleError(res, error, "Failed to add comment");
  }
};

export const updateAccountantQueryHubTicketStatus = async (req, res) => {
  try {
    const ticket = await getTicketForAccountant(req.params.ticketId);
    const status = String(req.body?.status || "").toLowerCase();

    if (!["open", "closed"].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be open or closed" });
    }

    const nextUpdate = {
      status,
      last_activity_at: new Date(),
    };

    if (status === "closed") {
      nextUpdate.closed_at = new Date();
      nextUpdate.closed_by = req.user._id;
    } else {
      nextUpdate.closed_at = null;
      nextUpdate.closed_by = null;
    }

    const updated = await QueryHubTicket.findByIdAndUpdate(ticket._id, { $set: nextUpdate }, { new: true }).lean();
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return handleError(res, error, "Failed to update ticket status");
  }
};

export const initAccountantQueryHubDocumentUpload = async (req, res) => {
  try {
    const ticket = await getTicketForAccountant(req.params.ticketId);
    const { fileName, contentType, fileSize } = req.body || {};

    const valid = validateUploadPayload({ fileName, contentType, fileSize });
    if (!valid.ok) {
      return res.status(400).json({ success: false, message: valid.message });
    }

    if (ticket.status === "closed") {
      return res.status(409).json({ success: false, message: "Cannot upload documents to a closed ticket" });
    }

    const payload = await createQueryHubUploadSignedUrl({ ticket, fileName, contentType, fileSize });
    return res.status(200).json({ success: true, data: payload });
  } catch (error) {
    return handleError(res, error, "Failed to initialize upload");
  }
};

export const completeAccountantQueryHubDocumentUpload = async (req, res) => {
  try {
    const ticket = await getTicketForAccountant(req.params.ticketId);
    const { key, fileName, contentType, fileSize, message } = req.body || {};

    if (!key || !fileName || !contentType) {
      return res.status(400).json({ success: false, message: "key, fileName and contentType are required" });
    }

    if (ticket.status === "closed") {
      return res.status(409).json({ success: false, message: "Cannot upload documents to a closed ticket" });
    }

    const document = await createQueryHubDocumentRecord({
      ticket,
      user: req.user,
      key,
      fileName,
      contentType,
      fileSize,
      message,
    });

    return res.status(201).json({ success: true, data: document });
  } catch (error) {
    return handleError(res, error, "Failed to complete upload");
  }
};

export const listAccountantQueryHubDocuments = async (req, res) => {
  try {
    const ticket = await getTicketForAccountant(req.params.ticketId);
    const docs = await listQueryHubTicketDocuments(ticket._id);
    return res.status(200).json({ success: true, data: docs, total: docs.length });
  } catch (error) {
    return handleError(res, error, "Failed to fetch documents");
  }
};
