// GET /accountant/compliance-requests
import mongoose from "mongoose";
import { ComplianceTicket } from "../../models/compliance/complianceTicketModel.js";
import { ComplianceComment } from "../../models/compliance/complianceCommentModel.js";
import { ComplianceTemplate } from "../../models/compliance/complianceTemplateModel.js"; // added: for batch description lookup from template
import { Organization } from "../../models/organizationModel.js"; // added: needed for explicit populate (ComplianceTicket.organization_id has no ref set in schema)
import { fetchOrganizationCompanyProfile } from "../../services/accountant/accountantOrgDetailService.js"; // added: company profile (CIN/GSTIN/PAN/TAN) lives in CompanyComplianceProfile, not Organization


export const getComplianceRequests = async (req, res) => {
    try {
        const {
            search,
            category,
            status,
            client_updates_only,
            organization_id,   // added: used by org drill-down view to scope tickets to one org
            sort_by = "overdue_first",
            page = 1,
            limit = 20,
        } = req.query;

        const parsedPage = Math.max(parseInt(page) || 1, 1);
        const parsedLimit = Math.min(parseInt(limit) || 20, 100);
        const skip = (parsedPage - 1) * parsedLimit;

        // =========================
        // 1️⃣ BUILD MATCH OBJECT
        // =========================

        const match = {};

        // ORG FILTER — added to support org drill-down view in AccountantComplianceEngine
        // When organization_id is provided, scope results to that single organization
        if (organization_id) {
            match.organization_id = organization_id; // Mongoose auto-casts string → ObjectId
        }

        // CATEGORY FILTER
        if (category && category !== "all") {
            match.category_tag = category;
        }

        // STATUS FILTER
        if (status && status !== "all") {
            match.status = status;
        }

        // CLIENT UPDATE FILTER
        if (client_updates_only === "true") {
            match.has_unread_client_update = true;
        }

        // SEARCH (indexed fields only)
        if (search) {
            const q = search.trim();

            match.$or = [
                { subtag: { $regex: q, $options: "i" } },
                { financial_year: { $regex: q, $options: "i" } }
            ];

            // If searching by ObjectId format (ticket id)
            if (q.match(/^[0-9a-fA-F]{24}$/)) {
                match.$or.push({ _id: q });
            }
        }

        // =========================
        // 2️⃣ BUILD SORT OBJECT
        // =========================

        let sort = {};

        switch (sort_by) {
            case "due_date":
                sort = { due_date: 1 };
                break;

            case "status":
                sort = { status: 1 };
                break;

            case "category":
                sort = { category_tag: 1 };
                break;

            case "organization":
                sort = { organization_id: 1 };
                break;

            case "recent_activity":
                sort = { last_activity_at: -1 };
                break;

            case "overdue_first":
            default:
                sort = {
                    status: 1,       // assuming overdue status sorted first lexicographically
                    due_date: 1
                };
                break;
        }

        // =========================
        // 3️⃣ EXECUTE QUERY
        // =========================

        let [data, total] = await Promise.all([
            ComplianceTicket.find(match)
                .sort(sort)
                .skip(skip)
                .limit(parsedLimit)
                // Fixed: ComplianceTicket.organization_id has no 'ref' in its schema,
                // so Mongoose's populate() requires an explicit model: option to know which collection to query.
                // Without this, populate silently returns the raw ObjectId and organization_name is always empty.
                .populate({ path: "organization_id", model: "Organization", select: "name" })
                .populate({ path: "obligation_id", select: "form_description" })
                .lean(),

            ComplianceTicket.countDocuments(match)
        ]);

        // === TEMPLATE DESCRIPTION BATCH LOOKUP ===
        // form_description lives in ComplianceTemplate.description (matched by category_tag + subtag).
        // ComplianceObligation.form_description may be empty; template is the authoritative source.
        if (data.length > 0) {
            const uniquePairs = [...new Set(data.map(t => `${t.category_tag}|${(t.subtag || "").toLowerCase()}`))]
                .map(key => {
                    const [cat, sub] = key.split("|");
                    return { category_tag: cat, subtag: { $regex: new RegExp(`^${sub}$`, "i") } };
                });
            const templates = await ComplianceTemplate.find({ $or: uniquePairs })
                .select("category_tag subtag description").lean();
            const templateMap = {};
            templates.forEach(tmpl => {
                templateMap[`${tmpl.category_tag}|${tmpl.subtag.toLowerCase()}`] = tmpl.description || "";
            });
            data = data.map(t => ({
                ...t,
                // Prefer template description → obligation form_description → empty string
                form_description: templateMap[`${t.category_tag}|${(t.subtag || "").toLowerCase()}`]
                    || t.obligation_id?.form_description
                    || "",
            }));
        }

        return res.status(200).json({
            data,
            total,
            page: parsedPage,
            pages: Math.ceil(total / parsedLimit),
        });

    } catch (error) {
        console.error("Compliance list error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};



export const getComplianceRequestDetail = async (req, res) => {
    try {
        const { ticketId } = req.params;

        // 1️⃣ Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(ticketId)) {
            return res.status(400).json({ message: "Invalid ticket ID" });
        }

        // 2️⃣ Fetch ticket with populate
        // NOTE: organization_id has no 'ref' in ComplianceTicket schema, so model must be explicit.
        const ticket = await ComplianceTicket.findById(ticketId)
            .populate({
                path: "organization_id",
                model: "Organization",
                select: "name"
            })
            .populate({
                path: "obligation_id",
                select: "category_tag subtag form_description financial_year due_date recurrence_type"
            })
            .lean();

        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" });
        }

        // 2b️⃣ Fetch CompanyComplianceProfile — CIN/GSTIN/PAN/TAN live here, NOT on Organization
        const orgId = ticket.organization_id?._id || ticket.organization_id;
        const companyProfile = orgId ? await fetchOrganizationCompanyProfile(String(orgId)) : null;

        // 2c️⃣ Template description lookup — ComplianceObligation.form_description is often empty;
        //       ComplianceTemplate.description is the authoritative source (same logic as the list endpoint)
        let resolvedFormDescription = ticket.obligation_id?.form_description || "";
        const catTag = ticket.category_tag;
        const subTag = (ticket.subtag || "").toLowerCase();
        if (catTag) {
            const tmpl = await ComplianceTemplate.findOne({
                category_tag: catTag,
                subtag: { $regex: new RegExp(`^${subTag}$`, "i") },
            }).select("description").lean();
            if (tmpl?.description) resolvedFormDescription = tmpl.description;
        }

        // 3️⃣ Access control check (example placeholder)
        // TODO: verify accountant permission here

        if (ticket.has_unread_client_update) {
            await ComplianceTicket.updateOne(
                { _id: ticketId },
                { has_unread_client_update: false }
            );
        }

        // 4️⃣ Structured response (clean shape) — include status_history when available
        return res.status(200).json({
          ticket: {
            id: ticket._id,
            status: ticket.status,
            due_date: ticket.due_date,
            financial_year: ticket.financial_year,
            category_tag: ticket.category_tag,
            subtag: ticket.subtag,
            form_description: resolvedFormDescription,
            filing_metadata: ticket.filing_metadata,
            last_activity_at: ticket.last_activity_at,
            created_at: ticket.createdAt,
            updated_at: ticket.updatedAt,
            status_history: ticket.status_history || [],
          },
          organization: {
            name: ticket.organization_id?.name || null,
            ...(companyProfile || {}),
            // alias registered_office_address → registered_address for UI consistency
            registered_address: companyProfile?.registered_office_address || null,
          },
          obligation: ticket.obligation_id
        });

    } catch (error) {
        console.error("Ticket detail error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};





export const getTicketComments = async (req, res) => {
  try {
    const { ticketId } = req.params;

    // 1️⃣ Validate ID
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }

    // 2️⃣ Fetch sorted comments (ASC oldest → newest), populate author info
    const comments = await ComplianceComment.find({
      ticket_id: ticketId,
    })
      .sort({ createdAt: 1 })
      .populate("user_id", "name email")
      .lean();

    // Normalise shape for frontend: add author_role, author_email fields
    const normalised = comments.map((c) => ({
      ...c,
      author_role: c.role === "admin" ? "accountant" : "client",
      author_email: c.user_id?.email || null,
      author_name: c.user_id?.name || null,
    }));

    return res.status(200).json({
      total: normalised.length,
      data: normalised,
    });

  } catch (error) {
    console.error("Comments fetch error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};





export const markTicketAsRead = async (req, res) => {
  try {
    const { ticketId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }

    await ComplianceTicket.updateOne(
      { _id: ticketId },
      { $set: { has_unread_client_update: false } }
    );

    return res.status(200).json({ message: "Marked as read" });

  } catch (error) {
    console.error("Mark read error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};




export const postComment = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message, attachments = [] } = req.body;

    // Support both _id and id (passport / JWT middleware variations)
    const user_id = req.user?._id || req.user?.id;
    const userRole = req.user?.role; // raw role from auth: "accountant"|"admin"|"client"|"user"

    // Map to schema enum — ComplianceComment.role is ['user','accountant']
    const role = (userRole === "admin" || userRole === "accountant") ? "accountant" : "user";

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    // organization_id is required by the schema — fetch it from the ticket
    const ticket = await ComplianceTicket.findById(ticketId).select("organization_id").lean();
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const now = new Date();

    // 1️⃣ Insert comment (no transaction — works with standalone MongoDB too)
    const comment = await ComplianceComment.create({
      ticket_id: ticketId,
      organization_id: ticket.organization_id,
      user_id,
      role,
      message: message.trim(),
      attachments: attachments || [],
    });

    // 2️⃣ Update ticket metadata
    const updatePayload = {
      last_comment_at: now,
      last_comment_by_role: role,
      last_activity_at: now,
    };

    // If CLIENT posts → mark unread for accountant
    if (userRole === "client" || userRole === "user") {
      updatePayload.has_unread_client_update = true;
    }

    await ComplianceTicket.updateOne(
      { _id: ticketId },
      { $set: updatePayload }
    );

    return res.status(201).json({
      message: "Comment posted successfully",
      data: comment,
    });

  } catch (error) {
    console.error("Post comment error:", error);
    return res.status(500).json({ message: "Server error", detail: error.message });
  }
};





export const getTicketMeta = async (req, res) => {
  try {
    const { ticketId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }

    const ticket = await ComplianceTicket.findById(
      ticketId,
      {
        last_comment_at: 1,
        last_comment_by_role: 1,
        has_unread_client_update: 1,
      }
    ).lean();

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    return res.status(200).json(ticket);

  } catch (error) {
    console.error("Meta fetch error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


export const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;

    const ALLOWED_STATUSES = [
      "initiated", "pending_docs", "in_progress",
      "filed", "approved", "overdue", "closed",
    ];

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const now = new Date();

    // Read existing ticket to determine previous status and whether history exists
    const existing = await ComplianceTicket.findById(ticketId).select("status status_history createdAt");
    if (!existing) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const pushes = [];

    // If there is no status_history recorded (old tickets), insert an initial 'initiated' record
    if (!Array.isArray(existing.status_history) || existing.status_history.length === 0) {
      pushes.push({
        status: existing.status || "initiated",
        from_status: null,
        to_status: existing.status || "initiated",
        changed_by_role: "system",
        changed_by: null,
        at: existing.createdAt || new Date(),
        note: "initial import",
      });
    }

    // Push the new transition (from -> to)
    pushes.push({
      from_status: existing.status || null,
      status: status,
      to_status: status,
      changed_by_role: req.user?.role || "system",
      changed_by: req.user?.id || null,
      at: now,
      note: req.body.note || null,
    });

    const updated = await ComplianceTicket.findByIdAndUpdate(
      ticketId,
      {
        $set: {
          status,
          last_activity_at: now,
          // Stamp closed_at when moving to closed so avg resolution can be computed accurately
          ...(status === "closed" ? { closed_at: now } : {}),
        },
        $push: { status_history: { $each: pushes } },
      },
      { new: true, select: "_id status closed_at" }
    );

    if (!updated) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    return res.status(200).json({
      message: "Status updated",
      status: updated.status,
    });

  } catch (error) {
    console.error("Status update error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


// GET /accountant/compliance-requests/:ticketId/status-history
export const getTicketStatusHistory = async (req, res) => {
  try {
    const { ticketId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }

    // Populate changed_by user basic details when available
    const ticket = await ComplianceTicket.findById(ticketId)
      .select("status_history createdAt status last_activity_at updatedAt")
      .populate({ path: "status_history.changed_by", select: "_id name email role" })
      .lean();

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    let history = Array.isArray(ticket.status_history) ? ticket.status_history : [];

    // Fallback: if no recorded history exists, synthesize minimal timeline
    if (!history || history.length === 0) {
      history = [];
      // Initiated event
      history.push({ status: "initiated", at: ticket.createdAt });

      // Current status event (if different from initiated)
      if (ticket.status && ticket.status !== "initiated") {
        history.push({ status: ticket.status, at: ticket.last_activity_at || ticket.updatedAt || new Date() });
      }
    }

    return res.status(200).json({ total: history.length, data: history });

  } catch (error) {
    console.error("Status history fetch error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};