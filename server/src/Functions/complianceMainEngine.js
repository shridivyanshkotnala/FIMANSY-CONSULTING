import { ComplianceTemplate } from "../models/compliance/complianceTemplateModel.js";
import { ComplianceObligation } from "../models/compliance/complianceObligationModel.js";
import { CompanyComplianceProfile } from "../models/compliance/companyComplianceProfileModel.js";
import { getFinancialYearDates } from "../utils/calenderLogic.js";
import { generateMonthlyDueDates, generateQuarterlyDueDates, generateAnnualDueDate } from "../utils/calenderLogic.js";

export async function generateObligationsForFY(organization_id, financialYear) {
  console.log(`🚀 Generating obligations for org: ${organization_id}, FY: ${financialYear}`);
  
  const company = await CompanyComplianceProfile.findOne({ organization_id });
  if (!company) {
    console.error(`❌ Company not found for organization_id: ${organization_id}`);
    throw new Error("Company not found");
  }

  const templates = await ComplianceTemplate.find({ is_active: true });
  console.log(`📋 Found ${templates.length} active templates`);

  if (templates.length === 0) {
    console.error('❌ No templates found! Please run seed script.');
    throw new Error("No compliance templates found");
  }

  const { start: fyStart, end: fyEnd } = getFinancialYearDates(financialYear);
  console.log(`📅 FY Range: ${fyStart} to ${fyEnd}`);

  const obligationsToInsert = [];

  for (const template of templates) {
    let dueDates = [];

    switch (template.recurrence_type) {
      case "monthly":
        dueDates = generateMonthlyDueDates(template, fyStart, fyEnd);
        break;
      case "quarterly":
        dueDates = generateQuarterlyDueDates(template, fyStart, fyEnd);
        break;
      case "annual":
        dueDates = generateAnnualDueDate(template, fyStart, fyEnd);
        break;
      default:
        continue;
    }

    for (const dueDate of dueDates) {
      obligationsToInsert.push({
        organization_id,
        // ✅ Add form_name field (use template name)
        form_name: template.name,
        // ✅ Add form_description field
        form_description: template.description,
        // ✅ Add compliance_type field (derived from category_tag)
        compliance_type: template.category_tag,
        // Keep existing fields
        category_tag: template.category_tag,
        subtag: template.subtag,
        description: template.description,
        financial_year: financialYear,
        due_date: dueDate,
        status: "not_started", // Add default status
        is_recurring: true,
        recurrence_type: template.recurrence_type,
        recurrence_config: template.recurrence_config
      });
    }
  }

  console.log(`📦 Preparing to insert ${obligationsToInsert.length} obligations`);

  if (obligationsToInsert.length > 0) {
    const result = await ComplianceObligation.insertMany(obligationsToInsert, { ordered: false });
    console.log(`✅ Successfully inserted ${result.length} obligations`);
    return result.length;
  }

  console.log('⚠️ No obligations to insert');
  return 0;
}