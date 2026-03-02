import { generateObligationsForFY } from "../../Functions/complianceMainEngine.js";

export async function runMonthlyJob() {
  const today = new Date();

  // If April 1st → generate new FY obligations
  if (today.getMonth() === 3 && today.getDate() === 1) {
    const currentFY = `${today.getFullYear()}-${(today.getFullYear()+1).toString().slice(2)}`;

    // Fetch all organizations
    const organizations = await Organization.find({});

    for (const org of organizations) {
      await generateObligationsForFY(org._id, currentFY);
    }
  }
}