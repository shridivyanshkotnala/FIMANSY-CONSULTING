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
    const user_role = req.user.role === "admin" ? "admin" : "user";

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

    const categoryTag = obligation.compliance_category || "other";
    const subtag =
      obligation.compliance_subtype ||
      String(obligation.form_name || "general")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") ||
      "general";

    // Create ticket with error handling for each step
    let ticket;
    try {
      ticket = await ComplianceTicket.create({
        organization_id,
        obligation_id,
        ticket_number,
        compliance_category: obligation.compliance_category,
        compliance_subtype: obligation.compliance_subtype,
        category_tag: categoryTag,
        subtag,
        financial_year: obligation.financial_year,
        due_date: obligation.due_date,
        created_by: user_id,
        last_activity_at: new Date(),
        status_history: [
          {
            status: "initiated",
            changed_by_role: user_role,
            changed_by: user_id,
            note: "Ticket created"
          }
        ]
      });
      console.log("Ticket created successfully:", ticket._id);

      // ✅ IMPORTANT: Update the obligation with ticket_id and change its status
      obligation.ticket_id = ticket._id;
      obligation.status = "in_progress"; // or "initiated" based on your workflow
      await obligation.save();
      console.log("Obligation updated with ticket_id and status changed to in_progress");

    } catch (createError) {
      console.error("Error creating ticket:", createError);
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
        console.log("Comment created successfully:", newComment._id);

        ticket.last_comment_at = newComment.createdAt;
        ticket.last_comment_by_role = newComment.role;
        ticket.last_activity_at = new Date();

        await ticket.save();
        console.log("Ticket updated with comment metadata");
      } catch (commentError) {
        console.error("Error creating comment:", commentError);
        // Don't fail the whole request if comment fails
      }
    }

    // Return the ticket with the updated obligation info
    return res.status(201).json({
      success: true,
      data: {
        ...ticket.toObject(),
        obligation: {
          _id: obligation._id,
          status: obligation.status,
          ticket_id: obligation.ticket_id
        }
      }
    });

  } catch (error) {
    console.error("createTicket error details:", {
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

    const organization_id = req.user.organization_id;

    const { status, category } = req.query;

    const filter = { organization_id };

    if (status) filter.status = status;
    if (category) filter.compliance_category = category;

    const tickets = await ComplianceTicket
      .find(filter)
      .sort({ due_date: 1 });

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

    const ticket = await ComplianceTicket
      .findById(req.params.id);

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
 * Get Ticket Comments
 * GET /api/compliance/tickets/:id/comments
 */
export const getTicketComments = async (req, res) => {
  try {

    const comments = await ComplianceComment
      .find({ ticket_id: req.params.id })
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: comments
    });

  } catch (error) {

    console.error("getTicketComments error", error);

    res.status(500).json({
      success: false
    });

  }
};




/**
 * Add Comment
 * POST /api/compliance/tickets/:id/comments
 */
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
    const organization_id = req.user.organization_id;
    const role = req.user.role === "admin" ? "admin" : "user";

    const {
      message,
      attachments = []
    } = req.body;

    if (!message && attachments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message or attachment required"
      });
    }

    const comment = await ComplianceComment.create({

      ticket_id,
      organization_id,
      user_id,

      role,

      message,
      attachments

    });


    ticket.last_comment_at = comment.createdAt;
    ticket.last_comment_by_role = role;
    ticket.last_activity_at = new Date();

    if (role === "user") {
      ticket.has_unread_client_update = true;
    }

    await ticket.save();

    res.status(201).json({
      success: true,
      data: comment
    });

  } catch (error) {

    console.error("addComment error", error);

    res.status(500).json({
      success: false
    });

  }
};




/**
 * Update Ticket Status
 * PATCH /api/compliance/tickets/:id/status
 */
export const updateTicketStatus = async (req, res) => {
  try {

    const ticket = await ComplianceTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false
      });
    }

    const { status, note } = req.body;

    const user_id = req.user._id;
    const role = req.user.role === "admin" ? "admin" : "user";

    ticket.status = status;

    ticket.status_history.push({

      status,
      changed_by_role: role,
      changed_by: user_id,
      note

    });

    ticket.last_activity_at = new Date();

    if (status === "closed") {
      ticket.closed_at = new Date();
    }

    await ticket.save();

    res.json({
      success: true,
      data: ticket
    });

  } catch (error) {

    console.error("updateTicketStatus error", error);

    res.status(500).json({
      success: false
    });

  }
};