import { ComplianceTemplate } from "../models/compliance/complianceTemplateModel.js";
import { ComplianceObligation } from "../models/compliance/complianceObligationModel.js";
import { CompanyComplianceProfile } from "../models/compliance/companyComplianceProfileModel.js";
import { getFinancialYearDates } from "../utils/calenderLogic.js";
import { generateMonthlyDueDates, generateQuarterlyDueDates, generateAnnualDueDate } from "../utils/calenderLogic.js";

// Default templates to seed if none exist
const DEFAULT_TEMPLATES = [
  {
    name: "GST Return – GSTR-1",
    compliance_category: "gst",
    compliance_subtype: "gstr1",
    compliance_description: "Outward supply details",
    recurrence_type: "monthly", // Can also be quarterly for QRMP
    recurrence_config: { due_day: 11, offset_months: 1 },
    is_active: true
  },
  {
    name: "GST Return – GSTR-3B",
    compliance_category: "gst",
    compliance_subtype: "gstr3b",
    compliance_description: "Summary of sales, ITC and tax payable",
    recurrence_type: "monthly",
    recurrence_config: { due_day: 20, offset_months: 1 },
    is_active: true
  },
  
  // ========== TDS ==========
  {
    name: "TDS Payment",
    compliance_category: "tds",
    compliance_subtype: "tds_payment",
    compliance_description: "Deducted tax on salaries, contracts, rent, etc.",
    recurrence_type: "monthly",
    recurrence_config: { due_day: 7, offset_months: 1 },
    is_active: true
  },
  
  // ========== Payroll ==========
  {
    name: "PF Contribution",
    compliance_category: "payroll",
    compliance_subtype: "pf",
    compliance_description: "Employer & employee contribution (12% each)",
    recurrence_type: "monthly",
    recurrence_config: { due_day: 31, offset_months: 0 },
    is_active: true
  },
  {
    name: "ESIC Contribution",
    compliance_category: "payroll",
    compliance_subtype: "esic",
    compliance_description: "Employer (3.25%) & employee (0.75%) contribution",
    recurrence_type: "monthly",
    recurrence_config: { due_day: 15, offset_months: 1 },
    is_active: true
  },
  {
    name: "Professional Tax (PT)",
    compliance_category: "payroll",
    compliance_subtype: "professional_tax",
    compliance_description: "State professional tax - varies by state",
    recurrence_type: "monthly", // Can also be annual in some states
    recurrence_config: { due_day: 15, offset_months: 1 }, // Default, varies by state
    is_active: true
  },
  {
    name: "Payroll Processing",
    compliance_category: "payroll",
    compliance_subtype: "payroll_processing",
    compliance_description: "Salary computation, payslips, compliance deductions",
    recurrence_type: "monthly",
    recurrence_config: { due_day: 31, offset_months: 0 }, // End of month
    is_active: true
  },
  
  // ========== Income Tax ==========
  {
    name: "Income Tax Return (ITR-6)",
    compliance_category: "income_tax",
    compliance_subtype: "itr6",
    compliance_description: "Annual tax filing for companies",
    recurrence_type: "annual",
    recurrence_config: { due_day: 30, due_month: 9 }, // 30th Sept
    is_active: true
  },
  {
    name: "Tax Audit Report",
    compliance_category: "income_tax",
    compliance_subtype: "tax_audit",
    compliance_description: "Form 3CA/3CD - Mandatory if turnover > ₹1 Cr",
    recurrence_type: "annual",
    recurrence_config: { due_day: 30, due_month: 9 }, // 30th Sept
    is_active: true
  },
  {
    name: "Transfer Pricing Report",
    compliance_category: "income_tax",
    compliance_subtype: "transfer_pricing",
    compliance_description: "Form 3CEB - International or specified domestic transactions",
    recurrence_type: "annual",
    recurrence_config: { due_day: 30, due_month: 11 }, // 30th Nov
    is_active: true
  },
  {
  name: "Advance Tax",
  compliance_category: "income_tax",
  compliance_subtype: "advance_tax",
  compliance_description: "Quarterly advance tax payments",
  recurrence_type: "quarterly",
  recurrence_config: {
    due_dates: ["15-06", "15-09", "15-12", "15-03"]
  },
  is_active: true
},
{
  name: "TDS Return – Form 24Q/26Q",
  compliance_category: "tds",
  compliance_subtype: "tds_return",
  compliance_description: "Quarterly filing of TDS deducted",
  recurrence_type: "quarterly",
  recurrence_config: {
    due_dates: ["31-07", "31-10", "31-01", "31-05"]
  },
  is_active: true
},
  
  // ========== MCA ==========
  {
    name: "Form 16 & 16A Issuance",
    compliance_category: "mca",
    compliance_subtype: "form16",
    compliance_description: "TDS certificate to employees and vendors",
    recurrence_type: "annual",
    recurrence_config: { due_day: 15, due_month: 6 }, // By 15th June
    is_active: true
  },
  
  
  // Add these to your DEFAULT_TEMPLATES array
  // Add these to your DEFAULT_TEMPLATES array
{
  name: "Professional Tax",
  compliance_category: "payroll",
  compliance_subtype: "professional_tax",
  compliance_description: "Monthly/Annual professional tax payment - applicable in Maharashtra, Karnataka, West Bengal, Telangana",
  recurrence_type: "one_time",
  trigger_type: "conditional",
  recurrence_config: { 
    due_day: null,
    rule: "Varies by state — typically monthly or half-yearly",
    applicable_states: ["Maharashtra", "Karnataka", "West Bengal", "Telangana"]
  },
  is_active: true
},
{
  name: "Form 15CA / 15CB",
  compliance_category: "income_tax",
  compliance_subtype: "form_15ca_15cb",
  compliance_description: "Required for foreign remittances; Form 15CB (CA certificate) and Form 15CA filing before remittance",
  recurrence_type: "one_time",
  trigger_type: "conditional",
  recurrence_config: { 
    due_day: null,
    rule: "Before making foreign remittance",
    condition: "Triggered when foreign remittance is made"
  },
  is_active: true
},
{
  name: "Gratuity Compliance",
  compliance_category: "payroll",
  compliance_subtype: "gratuity",
  compliance_description: "Applicable when organization has 10+ employees; gratuity payment on employee exit after 5 years of service",
  recurrence_type: "one_time",
  trigger_type: "conditional",
  recurrence_config: { 
    due_day: null,
    rule: "Triggered on employee exit",
    threshold: {
      employee_count: 10,
      min_service_years: 5
    }
  },
  is_active: true
},
{
  name: "Trust Registration & Audit (Form 10A / 10B)",
  compliance_category: "income_tax",
  compliance_subtype: "form_10a_10b",
  compliance_description: "Form 10A for trust registration under Section 12A/80G and Form 10B audit report for trusts claiming exemption under Section 11",
  recurrence_type: "one_time",
  trigger_type: "conditional",
  recurrence_config: { 
    due_month: 8, // September
    due_day: 30,
    rule: "Form 10A: At time of registration | Form 10B: 30th September of assessment year",
    condition: "Triggered when trust applies for registration or when audit is applicable based on income threshold",
    threshold: {
      audit_required: true
    }
  },
  is_active: true
},
];

const ALLOWED_COMPLIANCE_CATEGORIES = new Set([
  "gst",
  "tds",
  "income_tax",
  "payroll",
  "mca",
]);

function normalizeComplianceCategory(rawCategory) {
  if (!rawCategory) return null;

  const normalized = String(rawCategory)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  const map = {
    gst: "gst",
    tds: "tds",
    income_tax: "income_tax",
    incometax: "income_tax",
    itr: "income_tax",
    advance_tax: "income_tax",
    payroll: "payroll",
    mca: "mca",
    mca_annual: "mca",
    mca_event: "mca",
    roc: "mca",
  };

  const mapped = map[normalized] || normalized;
  return ALLOWED_COMPLIANCE_CATEGORIES.has(mapped) ? mapped : null;
}

function inferCategoryFromTemplateText(name, subtype) {
  const haystack = `${name || ""} ${subtype || ""}`.toLowerCase();
  if (haystack.includes("gst") || haystack.includes("gstr")) return "gst";
  if (haystack.includes("tds")) return "tds";
  if (
    haystack.includes("income tax") ||
    haystack.includes("itr") ||
    haystack.includes("advance tax") ||
    haystack.includes("tax audit") ||
    haystack.includes("transfer pricing")
  ) {
    return "income_tax";
  }
  if (
    haystack.includes("pf") ||
    haystack.includes("esic") ||
    haystack.includes("payroll") ||
    haystack.includes("professional tax") ||
    haystack.includes("gratuity")
  ) {
    return "payroll";
  }
  if (haystack.includes("mca") || haystack.includes("roc")) return "mca";
  return null;
}

function resolveLegacyComplianceType(complianceCategory, complianceSubtype) {
  if (complianceCategory === "gst") return "gst";
  if (complianceCategory === "tds") return "tds";
  if (complianceCategory === "income_tax") {
    return String(complianceSubtype || "").includes("advance_tax")
      ? "advance_tax"
      : "income_tax";
  }
  if (complianceCategory === "mca") return "mca_annual";

  // Do not set for payroll since legacy enum does not include payroll.
  return undefined;
}

function pickFirstNonEmpty(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const asString = String(value).trim();
    if (asString.length > 0) return asString;
  }
  return null;
}

function deriveSubtypeFromName(name) {
  const base = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || null;
}

export async function generateObligationsForFY(organization_id, financialYear) {
  console.log("\n========== 🚀 GENERATE OBLIGATIONS STARTED ==========");
  console.log(`📌 Input - organization_id: ${organization_id}, financialYear: ${financialYear}`);
  console.log(`📌 Timestamp: ${new Date().toISOString()}`);

  // Step 1: Check company
  console.log("\n🔍 Step 1: Checking company profile...");
  const company = await CompanyComplianceProfile.findOne({ organization_id });

  if (!company) {
    console.error(`❌ Company not found for organization_id: ${organization_id}`);
    throw new Error("Company not found");
  }

  console.log(`✅ Company found: ${company.company_type}, ID: ${company._id}`);
  console.log(`   Obligations generated flag: ${company.obligations_generated}`);
  console.log(`   Date of incorporation: ${company.date_of_incorporation}`);

  // Step 2: Check templates
  console.log("\n🔍 Step 2: Checking for active templates...");
  let templates = await ComplianceTemplate.find({ is_active: true }).lean();

  console.log(`📊 Found ${templates.length} active templates`);

  if (templates.length === 0) {
    console.log("🌱 No templates found! Auto-seeding default templates...");

    try {
      const seedResult = await ComplianceTemplate.insertMany(DEFAULT_TEMPLATES);

      console.log(`✅ Auto-seeded ${seedResult.length} templates`);

      templates = await ComplianceTemplate.find({ is_active: true }).lean();

    } catch (seedError) {
      console.error("❌ Error during auto-seeding:", seedError.message);
      throw new Error("Failed to seed templates");
    }
  }

  if (templates.length === 0) {
    console.error("❌ No templates found even after seeding attempt!");
    throw new Error("No compliance templates found");
  }

  // Step 3: Calculate FY range
  console.log("\n🔍 Step 3: Calculating financial year range...");
  const { start: fyStart, end: fyEnd } = getFinancialYearDates(financialYear);

  console.log(`📅 FY Range: ${fyStart.toISOString()} → ${fyEnd.toISOString()}`);

  // NEW LOGIC: Incorporation-aware generation
  const incorporationDate = new Date(company.date_of_incorporation);

  const generationStart =
    incorporationDate > fyStart ? incorporationDate : fyStart;

  console.log(`📅 Generation Start Date: ${generationStart.toISOString()}`);

  // Step 4: Generate obligations
  console.log("\n🔍 Step 4: Generating obligations for each template...");

  const obligationsToInsert = [];

  for (const [index, template] of templates.entries()) {

    console.log(`\n🔄 Template ${index + 1}/${templates.length}`);
    console.log(`   Name: ${template.name}`);
    console.log(`   Type: ${template.recurrence_type}`);

    // Backward compatibility for legacy template field names.
    const complianceSubtype =
      pickFirstNonEmpty(template.compliance_subtype, template.subtag) ||
      deriveSubtypeFromName(template.name);

    const complianceCategory =
      normalizeComplianceCategory(
        pickFirstNonEmpty(template.compliance_category, template.category_tag)
      ) || inferCategoryFromTemplateText(template.name, complianceSubtype);

    const complianceDescription = pickFirstNonEmpty(
      template.compliance_description,
      template.description
    );

    if (!complianceCategory) {
      console.warn(
        `⚠️ Skipping template \"${template.name}\" due to invalid/missing compliance category`
      );
      continue;
    }

    if (!complianceSubtype) {
      console.warn(
        `⚠️ Skipping template \"${template.name}\" due to missing compliance subtype`
      );
      continue;
    }

    const complianceType = resolveLegacyComplianceType(
      complianceCategory,
      complianceSubtype
    );

    let dueDates = [];

    switch (template.recurrence_type) {

      case "monthly":
        console.log("📅 Generating monthly dates...");
        dueDates = generateMonthlyDueDates(template, generationStart, fyEnd);
        break;

      case "quarterly":
        console.log("📅 Generating quarterly dates...");
        dueDates = generateQuarterlyDueDates(template, generationStart, fyEnd);
        break;

      case "annual":
        console.log("📅 Generating annual date...");
        dueDates = generateAnnualDueDate(template, generationStart, fyEnd);
        break;

      default:
        console.log(`⚠️ Unknown recurrence type: ${template.recurrence_type}`);
        continue;
    }

    // Filter dates before incorporation (extra safety)
    dueDates = dueDates.filter(d => d >= generationStart);

    console.log(`✅ ${dueDates.length} valid due dates generated`);

    if (dueDates.length > 0) {
      console.log(
        `📅 Sample: ${dueDates
          .slice(0, 3)
          .map(d => d.toISOString().split("T")[0])
          .join(", ")}`
      );
    }

    for (const dueDate of dueDates) {

      if (isNaN(dueDate)) {
        console.warn("⚠️ Skipping invalid date");
        continue;
      }

      const obligation = {

        organization_id,

        form_name: template.name,
        form_description: complianceDescription,

        ...(complianceType ? { compliance_type: complianceType } : {}),
        compliance_category: complianceCategory,
        compliance_subtype: complianceSubtype,
        compliance_description: complianceDescription,

        financial_year: financialYear,

        due_date: dueDate,

        status: "not_started",

        is_recurring: true,
        recurrence_type: template.recurrence_type,
        recurrence_config: template.recurrence_config

      };

      obligationsToInsert.push(obligation);
    }
  }

  // Step 5: Insert obligations
  console.log("\n🔍 Step 5: Inserting obligations...");

  console.log(`📦 Total obligations to insert: ${obligationsToInsert.length}`);

  if (obligationsToInsert.length === 0) {
    console.log("⚠️ No obligations generated");
    return 0;
  }

  try {

    const result = await ComplianceObligation.insertMany(
      obligationsToInsert,
      { ordered: false }
    );

    console.log(`✅ Inserted ${result.length} obligations`);

    const verifyCount = await ComplianceObligation.countDocuments({
      organization_id,
      financial_year: financialYear
    });

    console.log(`📊 Verification count: ${verifyCount}`);

    console.log("\n========== ✅ GENERATION COMPLETED ==========");

    return result.length;

  } catch (error) {

    console.error("❌ Error inserting obligations:", error.message);

    if (error.writeErrors) {
      console.error(`Write Errors: ${error.writeErrors.length}`);
    }

    throw error;
  }
}