// server/src/services/complianceScheduler/monthlyJob.js
import { generateObligationsForFY } from "../../Functions/complianceMainEngine.js";
import { generateCurrentMonthObligations } from "./monthlyComplianceGenerator.js";
import Organization from "../../models/organizationModel.js";

export async function runMonthlyJob() {
  const today = new Date();
  console.log(`\n RUNNING MONTHLY JOB: ${today.toISOString()}`);
  
  // CASE 1: April 1st - Generate FULL FY obligations (annual setup)
  if (today.getMonth() === 3 && today.getDate() === 1) {
    console.log("📆 April 1st detected - Generating full FY obligations for all companies...");
    const currentFY = `${today.getFullYear()}-${(today.getFullYear()+1).toString().slice(2)}`;
    
    const organizations = await Organization.find({});
    console.log(`📊 Found ${organizations.length} organizations`);
    
    for (const org of organizations) {
      try {
        console.log(`\n🔄 Generating full FY for organization: ${org._id}`);
        const count = await generateObligationsForFY(org._id, currentFY);
        console.log(`✅ Generated ${count} obligations for FY ${currentFY}`);
      } catch (error) {
        console.error(`❌ Failed for organization ${org._id}:`, error.message);
      }
    }
  }
  
  // CASE 2: Every month - Generate ONLY current month's obligations
  console.log(`\n Generating obligations for ${today.toLocaleString('default', { month: 'long' })} ${today.getFullYear()}...`);
  try {
    const count = await generateCurrentMonthObligations();
    console.log(`✅ Monthly generation complete: ${count} obligations created`);
  } catch (error) {
    console.error("❌ Monthly generation failed:", error);
  }
  
  console.log("========== ✅ MONTHLY JOB COMPLETED ==========\n");
}