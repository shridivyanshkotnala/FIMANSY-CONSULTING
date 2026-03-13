/**
 * ticketCreationController.js
 * Endpoints:
 *   GET  /accountant/compliance-templates          → list active templates for dropdown
 *   GET  /accountant/all-organizations             → list all orgs for dropdown
 *   POST /accountant/compliance-requests/create    → create a manual ticket
 */

import mongoose from "mongoose";
import {
  getActiveComplianceTemplates,
  getAllOrganizationsForDropdown,
  resolveOrganization,
  createManualTicket,
} from "../../services/accountant/ticketCreationService.js";

// ─────────────────────────────────────────────
// GET /accountant/compliance-templates
// Returns all active ComplianceTemplate documents for the dropdown.
// ─────────────────────────────────────────────
export const listComplianceTemplates = async (req, res) => {
  try {
    const templates = await getActiveComplianceTemplates();
    return res.status(200).json({ data: templates });
  } catch (error) {
    console.error("listComplianceTemplates error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────
// GET /accountant/all-organizations
// Returns all active organizations for the org dropdown.
// ─────────────────────────────────────────────
export const listAllOrganizations = async (req, res) => {
  try {
    const orgs = await getAllOrganizationsForDropdown();
    return res.status(200).json({ data: orgs });
  } catch (error) {
    console.error("listAllOrganizations error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────
// POST /accountant/compliance-requests/create
// Body:
//   templateId       – ObjectId of ComplianceTemplate
//   organizationId   – ObjectId of existing Organization (optional if newOrgName given)
//   newOrgName       – string name for a brand-new organization (optional)
//   dueDate          – ISO date string
//   description      – optional override of template description
// ─────────────────────────────────────────────
export const createTicket = async (req, res) => {
  try {
    const { templateId, organizationId, newOrgName, dueDate, description } = req.body;
    const createdBy = req.user?._id;

    // ── Validation ────────────────────────────
    const errors = [];
    if (!templateId)  errors.push("templateId is required");
    if (!dueDate)     errors.push("dueDate is required");
    if (!organizationId && !newOrgName?.trim()) {
      errors.push("Either organizationId or newOrgName must be provided");
    }

    // Due date cannot be in the past
    const dueDateObj = dueDate ? new Date(dueDate) : null;
    if (dueDateObj && dueDateObj < new Date(new Date().setHours(0, 0, 0, 0))) {
      errors.push("Due date cannot be in the past");
    }

    if (errors.length) {
      return res.status(400).json({ message: errors.join("; "), errors });
    }

    // ── Resolve / create organisation ─────────
    const resolvedOrgId = await resolveOrganization({
      organizationId,
      newOrgName,
      createdBy,
    });

    // ── Create ticket ──────────────────────────
    const { ticket, ticketNumber } = await createManualTicket({
      templateId,
      organizationId: resolvedOrgId,
      dueDate,
      description,
      createdBy,
    });

    return res.status(201).json({
      message: `Ticket ${ticketNumber} created successfully`,
      ticket_number: ticketNumber,
      ticket_id: ticket._id,
      data: ticket,
    });
  } catch (error) {
    console.error("createTicket error:", error);
    if (
      error.message.includes("not found") ||
      error.message.includes("Invalid") ||
      error.message.includes("inactive") ||
      error.message.includes("provided")
    ) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Server error" });
  }
};
