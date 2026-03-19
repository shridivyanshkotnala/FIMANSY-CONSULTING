import mongoose from "mongoose";
import { ComplianceTicket } from "../../models/compliance/complianceTicketModel.js";
import { ComplianceComment } from "../../models/compliance/complianceCommentModel.js";
import { ComplianceObligation } from "../../models/compliance/complianceObligationModel.js";


/**
 * Generate Ticket Number
 * Format: TKT-YYYY-00001
 */
async function generateTicketNumber() {
  const year = new Date().getFullYear();

  const lastTicket = await ComplianceTicket
    .findOne({ ticket_number: new RegExp(`TKT-${year}`) })
    .sort({ createdAt: -1 });

  if (!lastTicket) {
    return `TKT-${year}-00001`;
  }

  const lastNumber = parseInt(lastTicket.ticket_number.split("-")[2]);
  const next = String(lastNumber + 1).padStart(5, "0");

  return `TKT-${year}-${next}`;
}

/**
 * Create Ticket
 * POST /api/compliance/tickets
 */
export const createTicket = async (req, res) => {
  try {
    console.log("=== CREATE TICKET DEBUG ===");
    console.log("User:", req.user?._id);
    console.log("Body:", req.body);

    const user_id = req.user._id;
    const user_role = (req.role === "owner" || req.role === "admin") ? "admin" : "user";

    const {
      obligation_id,
      comment,
      attachments = []
    } = req.body;

    console.log("Obligation ID:", obligation_id);

    if (!obligation_id) {
      return res.status(400).json({
        success: false,
        message: "obligation_id is required"
      });
    }

    // Check if obligation_id is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(obligation_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid obligation_id format"
      });
    }

    // Get the obligation to find its organization_id
    const obligation = await ComplianceObligation
      .findById(obligation_id)
      .select("organization_id compliance_category compliance_subtype financial_year due_date status ticket_id");
    
    console.log("Found obligation:", obligation ? "Yes" : "No");

    if (!obligation) {
      return res.status(404).json({
        success: false,
        message: "Obligation not found"
      });
    }

    // Check if ticket already exists
    const existingTicket = await ComplianceTicket.findOne({ obligation_id });
    if (existingTicket) {
      return res.status(400).json({
        success: false,
        message: "Ticket already exists for this obligation"
      });
    }

    // Get organization_id from the obligation
    const organization_id = obligation.organization_id;
    console.log("Organization ID from obligation:", organization_id);

    const ticket_number = await generateTicketNumber();
    console.log("Generated ticket number:", ticket_number);

    // Create ticket
    let ticket;
    try {
      const ticketData = {
        organization_id,
        obligation_id,
        ticket_number,
        compliance_category: obligation.compliance_category,
        compliance_subtype: obligation.compliance_subtype,
        financial_year: obligation.financial_year,
        due_date: obligation.due_date,
        created_by: user_id,
        last_activity_at: new Date(),
        status: "initiated",
        status_history: [
          {
            status: "initiated",
            changed_by_role: user_role,
            changed_by: user_id,
            note: "Ticket created from obligation"
          }
        ]
      };

      console.log("Creating ticket with data:", ticketData);
      ticket = await ComplianceTicket.create(ticketData);
      console.log("✅ Ticket created successfully:", ticket._id);

      // Update obligation with ticket_id
      obligation.ticket_id = ticket._id;
      await obligation.save();
      console.log("✅ Obligation updated with ticket_id");

    } catch (createError) {
      console.error("❌ Error creating ticket:", createError);
      return res.status(500).json({
        success: false,
        message: "Failed to create ticket record",
        error: createError.message
      });
    }

    /**
     * First Comment
     */
    if (comment || attachments.length) {
      try {
        const newComment = await ComplianceComment.create({
          ticket_id: ticket._id,
          organization_id,
          user_id,
          role: user_role,
          message: comment || "",
          attachments
        });
        console.log("✅ Comment created successfully:", newComment._id);

        ticket.last_comment_at = newComment.createdAt;
        ticket.last_comment_by_role = user_role;
        ticket.last_activity_at = new Date();

        await ticket.save();
        console.log("✅ Ticket updated with comment metadata");
      } catch (commentError) {
        console.error("❌ Error creating comment:", commentError);
        // Don't fail the whole request if comment fails
      }
    }

    // Return the populated ticket
    const populatedTicket = await ComplianceTicket.findById(ticket._id).lean();

    return res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: populatedTicket
    });

  } catch (error) {
    console.error("❌ createTicket error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    return res.status(500).json({
      success: false,
      message: "Failed to create ticket",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get Tickets
 * GET /api/compliance/tickets
 */
export const getTickets = async (req, res) => {
  try {
    const organization_id = req.organizationId || req.headers["x-organization-id"];
    const { status, category } = req.query;

    console.log("🔍 getTickets - organization_id:", organization_id);
    console.log("🔍 getTickets - query params:", { status, category });

    const filter = { organization_id };
    console.log("🔍 Filter:", filter);

    if (status) filter.status = status;
    if (category) filter.compliance_category = category;

    const tickets = await ComplianceTicket
      .find(filter)
      .sort({ due_date: 1 });

    console.log(`📊 Found ${tickets.length} tickets for org ${organization_id}`);
    
    res.json({
      success: true,
      data: tickets
    });

  } catch (error) {
    console.error("getTickets error", error);
    res.status(500).json({
      success: false
    });
  }
};

/**
 * Get Ticket Details
 * GET /api/compliance/tickets/:id
 */
export const getTicketById = async (req, res) => {
  try {
    const ticket = await ComplianceTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });
    }

    res.json({
      success: true,
      data: ticket
    });

  } catch (error) {
    console.error("getTicketById error", error);
    res.status(500).json({
      success: false
    });
  }
};

/**
 * Get Ticket Comments - FIXED
 * GET /api/compliance/tickets/:id/comments
 */
export const getTicketComments = async (req, res) => {
  try {
    const ticketId = req.params.id;
    
    console.log("🔍 Fetching comments for ticket ID:", ticketId);
    
    // Validate ticketId format
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID format"
      });
    }

    // Check if ticket exists first
    const ticket = await ComplianceTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });
    }

    // Fetch comments
    const comments = await ComplianceComment
      .find({ ticket_id: ticketId })
      .sort({ createdAt: 1 })
      .populate("user_id", "name email")
      .lean();

    const actorRole = req.user?.role || req.role;
    const isClientActor = actorRole !== "admin" && actorRole !== "accountant";
    if (isClientActor) {
      await ComplianceTicket.updateOne(
        { _id: ticketId },
        { $set: { has_unread_accountant_update: false } }
      );
    }

    console.log(`📊 Found ${comments.length} comments for ticket ${ticketId}`);

    // Set cache-control headers to prevent caching issues
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const normalised = comments.map((c) => ({
      ...c,
      author_role: c.role === "admin" ? "accountant" : "client",
      author_name: c.user_id?.name || null,
      author_email: c.user_id?.email || null,
    }));

    res.json({
      success: true,
      data: normalised
    });

  } catch (error) {
    console.error("❌ getTicketComments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch comments"
    });
  }
};

export const addComment = async (req, res) => {
  try {
    const ticket_id = req.params.id;
    const ticket = await ComplianceTicket.findById(ticket_id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });
    }

    const user_id = req.user._id;
    // ✅ FIX: Get organization_id from the ticket, not from req.user
    const organization_id = ticket.organization_id;
    // This endpoint is for client/org users. Treat all comments here as client-side.
    const user_role = "user";

    console.log("=== ADD COMMENT DEBUG ===");
    console.log("ticket_id:", ticket_id);
    console.log("ticket.organization_id:", ticket.organization_id);
    console.log("user_id:", user_id);
    console.log("organization_id:", organization_id);
    console.log("user_role:", user_role);
    console.log("req.role:", req.role);

    const {
      message,
      attachments = []
    } = req.body;

    console.log("message:", message);

    if (!message && attachments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message or attachment required"
      });
    }

    const comment = await ComplianceComment.create({
      ticket_id,
      organization_id,  // Now this comes from the ticket
      user_id,
      role: user_role,
      message,
      attachments
    });

    console.log("✅ Comment created with role:", comment.role);

    ticket.last_comment_at = comment.createdAt;
    ticket.last_comment_by_role = user_role;
    ticket.last_activity_at = new Date();

    // Client comment should always trigger "Client Updates" highlight for accountant.
    ticket.has_unread_client_update = true;
    ticket.has_unread_accountant_update = false;

    await ticket.save();

    res.status(201).json({
      success: true,
      data: comment
    });

  } catch (error) {
    console.error("❌ addComment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add comment"
    });
  }
};
/**
 * Update Ticket Status
 * PATCH /api/compliance/tickets/:id/status
 */
export const updateTicketStatus = async (req, res) => {
  try {
    // Only accountant/admin side can update ticket status.
    const actorRole = req.user?.role || req.role;
    const isAdminActor = actorRole === "admin" || actorRole === "accountant";
    if (!isAdminActor) {
      return res.status(403).json({
        success: false,
        message: "Only admin can update ticket status"
      });
    }

    const ticket = await ComplianceTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false
      });
    }

    const { status, note } = req.body;

    const user_id = req.user._id;
    const user_role = "admin";
    
    ticket.status = status;

    ticket.status_history.push({
      status,
      changed_by_role: user_role,
      changed_by: user_id,
      note,
      at: new Date()
    });

    ticket.last_activity_at = new Date();
    ticket.has_unread_accountant_update = true;

    if (status === "closed") {
      ticket.closed_at = new Date();
    }

    await ticket.save();

    // Return the updated ticket
    const updatedTicket = await ComplianceTicket.findById(ticket._id).lean();

    res.json({
      success: true,
      data: updatedTicket
    });

  } catch (error) {
    console.error("updateTicketStatus error", error);
    res.status(500).json({
      success: false
    });
  }
};