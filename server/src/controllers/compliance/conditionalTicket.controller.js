import mongoose from "mongoose";
import { ComplianceTicket } from "../../models/compliance/complianceTicketModel.js";
import { ComplianceComment } from "../../models/compliance/complianceCommentModel.js";
import { ComplianceTemplate } from "../../models/compliance/complianceTemplateModel.js";

const ALLOWED_CATEGORY = new Set(["gst", "tds", "income_tax", "mca", "payroll", "other"]);

function normalizeCategory(value) {
  if (!value) return null;
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  const map = {
    mca_annual: "mca",
    mca_event: "mca",
    advance_tax: "income_tax",
    income_tax: "income_tax",
    incometax: "income_tax",
    roc: "mca",
  };
  const mapped = map[normalized] || normalized;
  return ALLOWED_CATEGORY.has(mapped) ? mapped : null;
}

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
 * Get current financial year
 */
function getCurrentFinancialYear() {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

/**
 * Create Conditional Ticket - NO OBLIGATION REQUIRED!
 * POST /api/compliance/conditional/ticket
 */
export const createConditionalTicket = async (req, res) => {
  try {
    console.log("=== CREATE CONDITIONAL TICKET DEBUG ===");
    console.log("User:", req.user?._id);
    console.log("Organization ID from middleware:", req.organizationId);
    console.log("Body:", req.body);

    const user_id = req.user._id;
    // req.role comes from the membership (set by orgMiddleware)
    // Conditional ticket endpoint is used from client app; actor role should be client-side.
    const user_role = "user";

    // Get organization_id from the middleware
    const organization_id = req.organizationId;

    if (!organization_id) {
      console.error("❌ organization_id from middleware is missing!");
      return res.status(400).json({
        success: false,
        message: "Organization ID not found in request"
      });
    }

    const {
      template_id,
      comment,
      attachments = []
    } = req.body;

    if (!template_id) {
      return res.status(400).json({
        success: false,
        message: "template_id is required"
      });
    }

    // Validate template_id
    if (!mongoose.Types.ObjectId.isValid(template_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid template_id format"
      });
    }

    // Get the template
    const template = await ComplianceTemplate.findById(template_id);

    console.log("Found template:", template ? "Yes" : "No");

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    // Get data from template
    const compliance_category =
      normalizeCategory(template.compliance_category) ||
      normalizeCategory(template.category_tag) ||
      "other";
    const compliance_subtype = template.compliance_subtype || template.subtag || template.name;
    const financial_year = getCurrentFinancialYear();

    // Calculate due date from template
    const [startYear] = financial_year.split("-").map(Number);
    let due_date;

    if (template.recurrence_config?.due_month !== undefined &&
      template.recurrence_config?.due_day !== undefined) {
      const { due_month, due_day } = template.recurrence_config;
      const year = due_month >= 3 ? startYear : startYear + 1;
      due_date = new Date(year, due_month, due_day);
    } else {
      // Default due date (end of financial year)
      due_date = new Date(startYear + 1, 2, 31); // March 31st of next year
    }

    console.log("Template data extracted:", {
      compliance_category,
      compliance_subtype,
      financial_year,
      due_date,
      organization_id,
      template_id // Log this too
    });

    const ticket_number = await generateTicketNumber();
    console.log("Generated ticket number:", ticket_number);

    /**
     * Create Ticket - NO OBLIGATION ID!
     * Make sure template_id is explicitly set
     */
    const ticketData = {
      organization_id,
      ticket_number,
      template_id: template_id, // Explicitly set from the request
      compliance_category,
      compliance_subtype,
      financial_year,
      due_date,
      created_by: user_id,
      last_activity_at: new Date(),
      status: "initiated",  // ✅ Match the status_history
      status_history: [
        {
          status: "initiated",
          changed_by_role: user_role,
          changed_by: user_id,
          note: "Conditional ticket created from template"
        }
      ]
    };

    console.log("Creating ticket with data:", ticketData);

    const ticket = await ComplianceTicket.create(ticketData);
    console.log("✅ Conditional ticket created successfully:", ticket._id);
    console.log("✅ Ticket has template_id:", ticket.template_id); // Verify it was saved

    /**
     * First Comment
     */
    /**
 * First Comment
 */
    if (comment || attachments.length) {
      const newComment = await ComplianceComment.create({
        ticket_id: ticket._id,
        organization_id,
        user_id,
        role: user_role,
        message: comment || "",
        attachments
      });

      ticket.last_comment_at = newComment.createdAt;
      ticket.last_comment_by_role = newComment.role;
      ticket.last_activity_at = new Date();
      ticket.has_unread_client_update = true;

      await ticket.save();
      console.log("Comment created:", newComment._id);
    }
    const populatedTicket = await ComplianceTicket.findById(ticket._id).lean();

    return res.status(201).json({
      success: true,
      message: "Conditional ticket created successfully",
      data: populatedTicket
    });

  } catch (error) {
    console.error("❌ createConditionalTicket error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Check for validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create conditional ticket",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};