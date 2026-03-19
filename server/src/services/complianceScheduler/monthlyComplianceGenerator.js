import { Organization } from "../../models/organizationModel.js";
import { generateObligationsForFY } from "../../Functions/complianceMainEngine.js";

function getCurrentFinancialYearFromDate(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

export async function generateCurrentMonthObligations(referenceDate = new Date()) {
  const financialYear = getCurrentFinancialYearFromDate(referenceDate);
  const organizations = await Organization.find({}, { _id: 1 }).lean();

  let insertedTotal = 0;

  for (const org of organizations) {
    try {
      const inserted = await generateObligationsForFY(org._id, financialYear, {
        mode: "rolling",
        referenceDate,
      });
      insertedTotal += Number(inserted || 0);
    } catch (error) {
      console.error(
        `❌ Rolling obligation generation failed for org ${org._id}:`,
        error?.message || error
      );
    }
  }

  return insertedTotal;
}
