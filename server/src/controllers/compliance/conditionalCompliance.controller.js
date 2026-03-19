import { ComplianceTemplate } from "../../models/compliance/complianceTemplateModel.js";
import { ComplianceObligation } from "../../models/compliance/complianceObligationModel.js";
import { ComplianceTicket } from "../../models/compliance/complianceTicketModel.js"; // Added tickets
import { CompanyComplianceProfile } from "../../models/compliance/companyComplianceProfileModel.js";
import mongoose from "mongoose";

const DEFAULT_CONDITIONAL_TEMPLATES = [
  {
    name: "Professional Tax",
    compliance_category: "payroll",
    compliance_subtype: "professional_tax_conditional",
    compliance_description:
      "Monthly/Annual professional tax payment where state law applies.",
    recurrence_type: "one_time",
    trigger_type: "conditional",
    recurrence_config: {
      due_day: null,
      rule: "Varies by state — typically monthly or half-yearly",
      applicable_states: ["Maharashtra", "Karnataka", "West Bengal", "Telangana"],
    },
    is_active: true,
  },
  {
    name: "Form 15CA / 15CB",
    compliance_category: "income_tax",
    compliance_subtype: "form_15ca_15cb",
    compliance_description:
      "Required for foreign remittance before payment is made.",
    recurrence_type: "one_time",
    trigger_type: "conditional",
    recurrence_config: {
      due_day: null,
      rule: "Before making foreign remittance",
      condition: "Triggered when foreign remittance is made",
    },
    is_active: true,
  },
  {
    name: "Gratuity Compliance",
    compliance_category: "payroll",
    compliance_subtype: "gratuity_conditional",
    compliance_description:
      "Applicable when organization has 10+ employees and exit criteria are met.",
    recurrence_type: "one_time",
    trigger_type: "conditional",
    recurrence_config: {
      due_day: null,
      rule: "Triggered on employee exit",
      threshold: { employee_count: 10, min_service_years: 5 },
    },
    is_active: true,
  },
  {
    name: "Trust Registration & Audit (Form 10A / 10B)",
    compliance_category: "income_tax",
    compliance_subtype: "form_10a_10b",
    compliance_description:
      "Form 10A registration and Form 10B audit filing for eligible trusts.",
    recurrence_type: "one_time",
    trigger_type: "conditional",
    recurrence_config: {
      due_month: 8,
      due_day: 30,
      rule: "Form 10A: at registration | Form 10B: 30 September of assessment year",
      condition:
        "Triggered when trust applies for registration or audit is applicable",
      threshold: { audit_required: true },
    },
    is_active: true,
  },
];

const ALLOWED_CATEGORY = new Set(["gst", "tds", "income_tax", "payroll", "mca"]);

function normalizeCategory(value) {
  if (!value) return null;
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  const map = {
    income_tax: "income_tax",
    incometax: "income_tax",
    itr: "income_tax",
    advance_tax: "income_tax",
    mca_annual: "mca",
    mca_event: "mca",
    roc: "mca",
  };
  const mapped = map[normalized] || normalized;
  return ALLOWED_CATEGORY.has(mapped) ? mapped : null;
}

function getTemplateCategory(template) {
  return (
    normalizeCategory(template?.compliance_category) ||
    normalizeCategory(template?.category_tag) ||
    "other"
  );
}

function getTemplateSubtype(template) {
  return template?.compliance_subtype || template?.subtag || template?.name || "conditional_item";
}

function getTemplateDescription(template) {
  return template?.compliance_description || template?.description || "Conditional compliance item";
}

async function ensureConditionalTemplates() {
  const count = await ComplianceTemplate.countDocuments({
    trigger_type: "conditional",
    is_active: true,
  });

  if (count < DEFAULT_CONDITIONAL_TEMPLATES.length) {
    console.log("🌱 Ensuring default conditional templates are present...");
  }

  for (const tpl of DEFAULT_CONDITIONAL_TEMPLATES) {
    const setOnInsert = {
      ...tpl,
      category_tag: tpl.compliance_category,
      subtag: tpl.compliance_subtype,
      description: tpl.compliance_description,
    };

    await ComplianceTemplate.updateOne(
      { name: tpl.name, trigger_type: "conditional" },
      { $setOnInsert: setOnInsert },
      { upsert: true }
    );
  }
}

/**
 * Get conditional templates with ticket + obligation status
 */
export const getConditionalCompliances = async (req, res) => {
  try {
    const { organization_id, financialYear } = req.query;

    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: "organization_id is required"
      });
    }

    await ensureConditionalTemplates();

    // 1️⃣ Get all conditional templates
    const templates = await ComplianceTemplate.find({
      trigger_type: "conditional",
      is_active: true
    }).lean();

    console.log(`📋 Found ${templates.length} templates`);

    // 2️⃣ Get obligations for this org and FY
    const obligations = await ComplianceObligation.find({
      organization_id: new mongoose.Types.ObjectId(organization_id),
      financial_year: financialYear
    }).lean();

    console.log(`📋 Found ${obligations.length} obligations`);

    const obligationsMap = new Map();
    obligations.forEach(ob => {
      obligationsMap.set(ob.compliance_subtype, ob);
    });

    // 3️⃣ Get tickets for this organization that were created from templates
    const tickets = await ComplianceTicket.find({
      organization_id: new mongoose.Types.ObjectId(organization_id),
      template_id: { $exists: true, $ne: null }
    })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`🎫 Found ${tickets.length} tickets with template_id`);
    
    // Log the first few tickets to see their structure
    if (tickets.length > 0) {
      console.log("Sample ticket:", {
        id: tickets[0]._id,
        template_id: tickets[0].template_id,
        template_id_type: typeof tickets[0].template_id,
        template_id_string: tickets[0].template_id?.toString(),
        status: tickets[0].status
      });
    }

    const ticketsMap = new Map();
    tickets.forEach(ticket => {
      if (ticket.template_id) {
        const templateIdStr = ticket.template_id.toString();
        if (!ticketsMap.has(templateIdStr)) {
          ticketsMap.set(templateIdStr, []);
        }
        ticketsMap.get(templateIdStr).push(ticket);
        console.log(`📌 Mapped ticket ${ticket._id} to template ${templateIdStr}`);
      }
    });

    console.log(`🗺️ TicketsMap has ${ticketsMap.size} entries`);

    // 4️⃣ Combine template data with obligation + ticket status
    const conditionalItems = templates.map(template => {
      const templateSubtype = getTemplateSubtype(template);
      const templateCategory = getTemplateCategory(template);
      const templateDescription = getTemplateDescription(template);
      const existingObligation = obligationsMap.get(templateSubtype);
      const templateIdStr = template._id.toString();
      const templateTickets = ticketsMap.get(templateIdStr) || [];
      const activeTickets = templateTickets.filter((t) => t.status !== "closed");
      const latestActiveTicket = activeTickets[0] || null;
      const latestTicket = templateTickets[0] || null; // Any status (for history/debug)

      console.log(`🔍 Template ${template.name} (${templateIdStr}): has ${templateTickets.length} tickets`);

      return {
        // Template fields
        _id: template._id,
        name: template.name,
        compliance_category: templateCategory,
        compliance_subtype: templateSubtype,
        compliance_description: templateDescription,
        recurrence_config: template.recurrence_config,

        // For UI display
        primaryTag: templateCategory?.toUpperCase() || 'OTHER',
        secondaryTag: 'Conditional',
        applicability_info: getApplicabilityInfo(template),
        due_date_rule: getDueDateRule(template),

        // Obligation fields
        obligation_id: existingObligation?._id,
        obligation_status: existingObligation?.status || 'not_started',
        due_date: existingObligation?.due_date,
        is_generated: !!existingObligation,

        // Ticket fields
        tickets: templateTickets,
        ticket_count: templateTickets.length,
        latest_ticket: latestTicket,
        has_ticket: !!latestActiveTicket,
        ticket_status: latestActiveTicket?.status || null,
        ticket_id: latestActiveTicket?._id || null,
        ticket_data: latestActiveTicket || null,

        // For filing modal
        dueMonth: template.recurrence_config?.due_month,
        dueDay: template.recurrence_config?.due_day
      };
    });

    console.log("✅ Final conditional items:", conditionalItems.map(item => ({
      name: item.name,
      has_ticket: item.has_ticket,
      ticket_count: item.ticket_count,
      ticket_status: item.ticket_status
    })));

    res.json({
      success: true,
      data: conditionalItems
    });

  } catch (error) {
    console.error("❌ Error in getConditionalCompliances:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Generate a conditional obligation when user clicks "File"
 */
export const generateConditionalObligation = async (req, res) => {
  try {
    const { organization_id, template_id, financialYear, filingData } = req.body;

    if (!organization_id || !template_id || !financialYear) {
      return res.status(400).json({
        success: false,
        message: "organization_id, template_id, and financialYear are required"
      });
    }

    const template = await ComplianceTemplate.findById(template_id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    const templateCategory = getTemplateCategory(template);
    const templateSubtype = getTemplateSubtype(template);
    const templateDescription = getTemplateDescription(template);

    const existingObligation = await ComplianceObligation.findOne({
      organization_id: new mongoose.Types.ObjectId(organization_id),
      compliance_subtype: templateSubtype,
      financial_year: financialYear
    });

    if (existingObligation) {
      return res.status(409).json({
        success: false,
        message: "Obligation already exists for this financial year",
        data: existingObligation
      });
    }

    // Calculate due date
    const [startYear] = financialYear.split("-").map(Number);
    let dueDate = new Date();
    if (template.recurrence_config?.due_month !== undefined &&
        template.recurrence_config?.due_day) {
      const { due_month, due_day } = template.recurrence_config;
      dueDate = new Date(due_month >= 3 ? startYear : startYear + 1, due_month, due_day);
    }

    const obligation = new ComplianceObligation({
      organization_id: new mongoose.Types.ObjectId(organization_id),
      compliance_category: templateCategory === "other" ? "mca" : templateCategory,
      compliance_subtype: templateSubtype,
      compliance_description: templateDescription,
      form_name: template.name,
      form_description: templateDescription,
      due_date: dueDate,
      status: filingData?.status || 'initiated',
      financial_year: financialYear,
      is_recurring: false,
      recurrence_type: 'one_time',
      recurrence_config: template.recurrence_config,
      notes: filingData?.comment || '',
      priority: 3
    });

    await obligation.save();

    res.status(201).json({
      success: true,
      message: "Conditional obligation generated successfully",
      data: obligation
    });

  } catch (error) {
    console.error("❌ Error in generateConditionalObligation:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Check if a conditional template is applicable based on company data
 */
export const checkApplicability = async (req, res) => {
  try {
    const { organization_id, template_id } = req.params;

    const template = await ComplianceTemplate.findById(template_id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    const company = await CompanyComplianceProfile.findOne({
      organization_id: new mongoose.Types.ObjectId(organization_id)
    });

    if (!company) {
      return res.json({
        success: true,
        data: {
          is_applicable: true,
          reason: "Company profile not found, assuming applicable"
        }
      });
    }

    let isApplicable = true;
    let reason = "Applicable";

    if (template.name.includes("Professional Tax")) {
      const ptStates = ["Maharashtra", "Karnataka", "West Bengal", "Telangana"];
      isApplicable = ptStates.includes(company.state);
      reason = isApplicable ? "State levies professional tax" : "State does not levy professional tax";
    } else if (template.name.includes("Tax Audit")) {
      const turnover = company.turnover || 0;
      const digitalPct = company.digital_transaction_percentage || 0;
      if (turnover > 100000000) {
        isApplicable = true;
        reason = "Turnover exceeds ₹10 Cr";
      } else if (turnover > 10000000 && digitalPct < 95) {
        isApplicable = true;
        reason = "Turnover exceeds ₹1 Cr with less than 95% digital transactions";
      } else {
        isApplicable = false;
        reason = "Below audit threshold";
      }
    } else if (template.name.includes("GSTR-9")) {
      const turnover = company.turnover || 0;
      isApplicable = turnover > 20000000;
      reason = isApplicable ? "Turnover exceeds ₹2 Cr" : "Turnover below ₹2 Cr";
    }

    res.json({
      success: true,
      data: {
        is_applicable: isApplicable,
        reason: reason,
        template_id: template._id,
        template_name: template.name
      }
    });

  } catch (error) {
    console.error("❌ Error in checkApplicability:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper functions
function getApplicabilityInfo(template) {
  const infoMap = {
    "DIR-3 KYC": "Every individual holding a DIN as on 31st March must file KYC before 30th September.",
    "DPT-3 (Return of Deposits)": "Every company (other than Government company) that has accepted deposits or outstanding money.",
    "MSME-1": "Companies with outstanding payments to MSME vendors beyond 45 days.",
    "Professional Tax": "Applicable in states that levy professional tax. Rates and due dates vary by state.",
    "Tax Audit (Section 44AB)": `Business turnover > ₹1 Cr (₹10 Cr if 95%+ digital transactions), or profession receipts > ₹50L.`,
    "Transfer Pricing Audit (Section 92E)": "Companies with international transactions or specified domestic transactions exceeding ₹20 Cr.",
    "ITR-6 (Company)": "All companies registered under the Companies Act, except those claiming exemption under Section 11.",
    "GST Annual Return (GSTR-9)": "All regular GST-registered taxpayers with aggregate turnover exceeding ₹2 Cr."
  };
  
  return infoMap[template.name] || template.compliance_description || "Check if applicable to your business";
}

function getDueDateRule(template) {
  if (template.recurrence_config?.rule) {
    return template.recurrence_config.rule;
  }

  if (template.recurrence_config?.due_month !== undefined &&
      template.recurrence_config?.due_day) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${template.recurrence_config.due_day} ${months[template.recurrence_config.due_month]}`;
  }

  return "As applicable";
}