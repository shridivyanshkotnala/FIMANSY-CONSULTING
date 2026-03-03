import { ComplianceTemplate } from "../models/compliance/complianceTemplateModel.js";
import { ComplianceObligation } from "../models/compliance/complianceObligationModel.js";
import { CompanyComplianceProfile } from "../models/compliance/companyComplianceProfileModel.js";
import { getFinancialYearDates } from "../utils/calenderLogic.js";
import { generateMonthlyDueDates, generateQuarterlyDueDates, generateAnnualDueDate } from "../utils/calenderLogic.js";


export async function generateObligationsForFY(organization_id, financialYear) {
  const company = await CompanyComplianceProfile.findOne({ organization_id });
  if (!company) throw new Error("Company not found");

  const templates = await ComplianceTemplate.find({ is_active: true });

  const { start: fyStart, end: fyEnd } = getFinancialYearDates(financialYear);

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
        category_tag: template.category_tag,
        subtag: template.subtag,
        description: template.description,
        financial_year: financialYear,
        due_date: dueDate,
        is_recurring: true,
        recurrence_type: template.recurrence_type,
        recurrence_config: template.recurrence_config
      });
    }
  }

  await ComplianceObligation.insertMany(obligationsToInsert, { ordered: false });

  return obligationsToInsert.length;
}