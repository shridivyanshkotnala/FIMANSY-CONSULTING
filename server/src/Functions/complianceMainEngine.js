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

  // Step 3: Calculate FY range
  console.log("\n🔍 Step 3: Calculating financial year range...");
  const { start: fyStart, end: fyEnd } = getFinancialYearDates(financialYear);
  console.log(`📅 FY Range: ${fyStart} to ${fyEnd}`);

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

      };

      obligationsToInsert.push(obligation);
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