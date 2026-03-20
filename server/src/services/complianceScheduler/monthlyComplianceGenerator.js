import { Organization } from "../../models/organizationModel.js";
import { generateObligationsForFY } from "../../Functions/complianceMainEngine.js";
import { getCurrentFinancialYear, getCurrentSystemDate } from "../../utils/dateTime.js";

/**
 * Merge-generates obligations for the current financial year.
 * This is idempotent because generation uses unique keys and ordered:false inserts.
 */
export async function generateCurrentMonthObligations() {
  const now = getCurrentSystemDate();
  const currentFY = getCurrentFinancialYear(now);

  const organizations = await Organization.find({}, { _id: 1 }).lean();
  let totalInserted = 0;

  for (const org of organizations) {
    try {
      const inserted = await generateObligationsForFY(org._id, currentFY);
      totalInserted += Number(inserted || 0);
    } catch (error) {
      console.error(`❌ Failed monthly obligation merge for org ${org._id}:`, error.message);
    }
  }

  return totalInserted;
}
