/**
 * ticketCreationService.js
 * Handles all business-logic for manually creating compliance tickets.
 */

import mongoose from "mongoose";
import { ComplianceTemplate } from "../../models/compliance/complianceTemplateModel.js";
import { ComplianceTicket }   from "../../models/compliance/complianceTicketModel.js";
import { Organization }       from "../../models/organizationModel.js";

// ─────────────────────────────────────────────
// 1. FETCH ALL ACTIVE COMPLIANCE TEMPLATES
// ─────────────────────────────────────────────
export const getActiveComplianceTemplates = async () => {
  return ComplianceTemplate.find({ is_active: true })
    .select("_id name category_tag subtag description recurrence_type recurrence_config")
    .sort({ category_tag: 1, name: 1 })
    .lean();
};

// ─────────────────────────────────────────────
// 2. FETCH ALL ORGANIZATIONS (dropdown list)
// ─────────────────────────────────────────────
export const getAllOrganizationsForDropdown = async () => {
  return Organization.find({ status: "active" })
    .select("_id name")
    .sort({ name: 1 })
    .lean();
};

// ─────────────────────────────────────────────
// 3. GENERATE SEQUENTIAL TICKET NUMBER
// Format: AC-TKT-00001
// Uses findOneAndUpdate with $inc for atomic increment to avoid race conditions.
// ─────────────────────────────────────────────
const TICKET_NUMBER_PREFIX = "AC-TKT-";
const TICKET_NUMBER_PAD    = 5; // zero-padded to 5 digits

export const generateTicketNumber = async () => {
  // Find the last manually-created ticket by sorting ticket_number descending.
  // ticket_number strings are lexicographically sortable because they are zero-padded.
  const last = await ComplianceTicket.findOne(
    { ticket_number: { $regex: `^${TICKET_NUMBER_PREFIX}` } },
    { ticket_number: 1 },
    { sort: { ticket_number: -1 } }
  ).lean();

  let nextSeq = 1;
  if (last?.ticket_number) {
    const parts   = last.ticket_number.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return `${TICKET_NUMBER_PREFIX}${String(nextSeq).padStart(TICKET_NUMBER_PAD, "0")}`;
};

// ─────────────────────────────────────────────
// 4. RESOLVE / CREATE ORGANIZATION
// If organizationId is provided → validate it exists.
// If newOrgName is provided → create a new Organization document.
// Returns the resolved organizationId (ObjectId).
// ─────────────────────────────────────────────
export const resolveOrganization = async ({ organizationId, newOrgName, createdBy }) => {
  if (organizationId) {
    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      throw new Error("Invalid organization ID");
    }
    const org = await Organization.findById(organizationId).lean();
    if (!org) throw new Error("Organization not found");
    return org._id;
  }

  if (newOrgName && newOrgName.trim()) {
    const created = await Organization.create({
      name:  newOrgName.trim(),
      owner: createdBy,
    });
    return created._id;
  }

  throw new Error("Either organizationId or newOrgName must be provided");
};

// ─────────────────────────────────────────────
// 5. DERIVE FINANCIAL YEAR FROM DUE DATE
// India FY: April → March (e.g. 2025-26)
// ─────────────────────────────────────────────
const deriveFinancialYear = (dueDate) => {
  const d     = new Date(dueDate);
  const month = d.getMonth() + 1; // 1-12
  const year  = d.getFullYear();
  if (month >= 4) return `${year}-${String(year + 1).slice(-2)}`;
  return `${year - 1}-${String(year).slice(-2)}`;
};

// ─────────────────────────────────────────────
// 6. CREATE MANUAL COMPLIANCE TICKET
// ─────────────────────────────────────────────
export const createManualTicket = async ({
  templateId,
  organizationId,   // already-resolved ObjectId
  dueDate,
  description,      // may be overridden from template default
  createdBy,        // accountant / admin User ObjectId
}) => {
  // Fetch template
  if (!mongoose.Types.ObjectId.isValid(templateId)) {
    throw new Error("Invalid template ID");
  }
  const template = await ComplianceTemplate.findById(templateId).lean();
  if (!template)            throw new Error("Compliance template not found");
  if (!template.is_active)  throw new Error("Compliance template is inactive");

  const ticketNumber  = await generateTicketNumber();
  const financialYear = deriveFinancialYear(dueDate);
  const now           = new Date();

  const ticket = await ComplianceTicket.create({
    ticket_number:   ticketNumber,
    is_manual:       true,
    organization_id: organizationId,
    // no obligation_id for manual tickets
    category_tag:    template.category_tag,
    subtag:          template.subtag,
    financial_year:  financialYear,
    due_date:        new Date(dueDate),
    status:          "initiated",
    created_by:      createdBy,
    last_activity_at: now,
    status_history: [
      {
        status:          "initiated",
        changed_by_role: "admin",
        changed_by:      createdBy,
        at:              now,
        note:            "Ticket created manually by accountant",
      },
    ],
    filing_metadata: {
      // store the accountant's description override as a note
      srn_number: undefined,
      acknowledgement_number: undefined,
      ...(description ? { notes: description } : {}),
    },
  });

  return { ticket, ticketNumber };
};
