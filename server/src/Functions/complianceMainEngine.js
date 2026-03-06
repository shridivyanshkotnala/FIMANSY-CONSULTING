import { ComplianceTemplate } from "../models/compliance/complianceTemplateModel.js";
import { ComplianceObligation } from "../models/compliance/complianceObligationModel.js";
import { CompanyComplianceProfile } from "../models/compliance/companyComplianceProfileModel.js";
import { getFinancialYearDates } from "../utils/calenderLogic.js";
import { generateMonthlyDueDates, generateQuarterlyDueDates, generateAnnualDueDate } from "../utils/calenderLogic.js";

// Default templates to seed if none exist
const DEFAULT_TEMPLATES = [
  {
    name: "GST Return – GSTR-3B",
    compliance_category: "gst",
    compliance_subtype: "gstr3b",
    compliance_description: "Monthly GST return filing",
    recurrence_type: "monthly",
    recurrence_config: { due_day: 20, offset_months: 1 },
    is_active: true
  },
  {
    name: "TDS Return – 26Q",
    compliance_category: "tds",
    compliance_subtype: "26q",
    compliance_description: "Quarterly TDS filing",
    recurrence_type: "quarterly",
    recurrence_config: {
      due_dates: ["31-07", "31-10", "31-01", "30-04"]
    },
    is_active: true
  },
  {
    name: "Income Tax Return",
    compliance_category: "income_tax",
    compliance_subtype: "itr",
    compliance_description: "Annual income tax return",
    recurrence_type: "annual",
    recurrence_config: { due_day: 31, due_month: 7 },
    is_active: true
  }
];

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

  // Step 2: Check for templates
  console.log("\n🔍 Step 2: Checking for active templates...");
  let templates = await ComplianceTemplate.find({ is_active: true });
  console.log(`📊 Found ${templates.length} active templates initially`);
  
  if (templates.length === 0) {
    console.log('🌱 No templates found! Auto-seeding default templates...');
    console.log('📦 Default templates to insert:', DEFAULT_TEMPLATES.map(t => t.name).join(', '));
    
    try {
      const seedResult = await ComplianceTemplate.insertMany(DEFAULT_TEMPLATES);
      console.log(`✅ Auto-seeded ${seedResult.length} templates successfully`);
      console.log('📋 Seeded template IDs:', seedResult.map(t => t._id).join(', '));
      
      templates = await ComplianceTemplate.find({ is_active: true });
      console.log(`📊 After seeding: Found ${templates.length} active templates`);
    } catch (seedError) {
      console.error('❌ Error during auto-seeding:', seedError.message);
      console.error(seedError.stack);
      throw new Error("Failed to seed templates");
    }
  } else {
    console.log('📋 Existing templates found:');
    templates.forEach((t, index) => {
      console.log(`   ${index + 1}. ${t.name} (${t.compliance_category}) - ${t.recurrence_type}`);
      console.log(`      Config:`, JSON.stringify(t.recurrence_config));
    });
  }

  if (templates.length === 0) {
    console.error('❌ No templates found even after seeding attempt!');
    throw new Error("No compliance templates found");
  }

  // Step 3: Calculate FY range
  console.log("\n🔍 Step 3: Calculating financial year range...");
  const { start: fyStart, end: fyEnd } = getFinancialYearDates(financialYear);
  console.log(`📅 FY Range: ${fyStart.toISOString()} to ${fyEnd.toISOString()}`);

  // Step 4: Generate obligations
  console.log("\n🔍 Step 4: Generating obligations for each template...");
  const obligationsToInsert = [];

  for (const [index, template] of templates.entries()) {
    console.log(`\n   🔄 Processing template ${index + 1}/${templates.length}: ${template.name}`);
    console.log(`      Type: ${template.recurrence_type}`);
    console.log(`      Category: ${template.compliance_category}`);
    console.log(`      Subtype: ${template.compliance_subtype}`);
    
    let dueDates = [];

    switch (template.recurrence_type) {
      case "monthly":
        console.log(`      📅 Generating monthly due dates...`);
        dueDates = generateMonthlyDueDates(template, fyStart, fyEnd);
        break;
      case "quarterly":
        console.log(`      📅 Generating quarterly due dates...`);
        dueDates = generateQuarterlyDueDates(template, fyStart, fyEnd);
        break;
      case "annual":
        console.log(`      📅 Generating annual due dates...`);
        dueDates = generateAnnualDueDate(template, fyStart, fyEnd);
        break;
      default:
        console.log(`      ⚠️ Unknown recurrence type: ${template.recurrence_type}, skipping`);
        continue;
    }

    console.log(`      ✅ Generated ${dueDates.length} due dates`);
    
    if (dueDates.length > 0) {
      console.log(`      📅 Sample dates: ${dueDates.slice(0, 3).map(d => d.toISOString().split('T')[0]).join(', ')}${dueDates.length > 3 ? '...' : ''}`);
    }

    for (const [dateIndex, dueDate] of dueDates.entries()) {
      const obligation = {
        organization_id,
        form_name: template.name,
        form_description: template.compliance_description,
        compliance_type: template.compliance_category,
        compliance_category: template.compliance_category,
        compliance_subtype: template.compliance_subtype,
        compliance_description: template.compliance_description,
        financial_year: financialYear,
        due_date: dueDate,
        status: "not_started",
        is_recurring: true,
        recurrence_type: template.recurrence_type,
        recurrence_config: template.recurrence_config
      };
      
      obligationsToInsert.push(obligation);
      
      // Log first few obligations for debugging
      if (obligationsToInsert.length <= 3) {
        console.log(`      📝 Sample obligation ${obligationsToInsert.length}:`);
        console.log(`         - Due date: ${dueDate.toISOString().split('T')[0]}`);
        console.log(`         - Form: ${template.name}`);
      }
    }
  }

  // Step 5: Insert obligations
  console.log("\n🔍 Step 5: Inserting obligations into database...");
  console.log(`📦 Total obligations to insert: ${obligationsToInsert.length}`);

  if (obligationsToInsert.length > 0) {
    try {
      console.log(`⏳ Inserting ${obligationsToInsert.length} obligations...`);
      const result = await ComplianceObligation.insertMany(obligationsToInsert, { ordered: false });
      console.log(`✅ Successfully inserted ${result.length} obligations`);
      
      // Verify insertion
      const verifyCount = await ComplianceObligation.countDocuments({ 
        organization_id,
        financial_year: financialYear 
      });
      console.log(`📊 Verification: Found ${verifyCount} obligations in database for this organization/FY`);
      
      console.log("\n========== ✅ GENERATE OBLIGATIONS COMPLETED ==========");
      return result.length;
    } catch (insertError) {
      console.error('❌ Error inserting obligations:', insertError.message);
      if (insertError.writeErrors) {
        console.error('Write errors:', insertError.writeErrors.length);
      }
      throw insertError;
    }
  }

  console.log('⚠️ No obligations to insert');
  console.log("\n========== ⚠️ GENERATE OBLIGATIONS COMPLETED (NO DATA) ==========");
  return 0;
}