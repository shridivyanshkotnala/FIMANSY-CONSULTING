// server/src/services/complianceScheduler/monthlyJob.js
import { generateCurrentMonthObligations } from "./monthlyComplianceGenerator.js";

export async function runMonthlyJob() {
  const today = new Date();
  console.log(`\n RUNNING MONTHLY JOB: ${today.toISOString()}`);

  // Every month: generate rolling obligations for current period.
  // This includes current-month monthly obligations, current-quarter quarterly
  // obligations, and annual obligations for the active FY (idempotent upsert).
  console.log(`\n Generating obligations for ${today.toLocaleString('default', { month: 'long' })} ${today.getFullYear()}...`);
  try {
    const count = await generateCurrentMonthObligations(today);
    console.log(`✅ Monthly generation complete: ${count} obligations created`);
  } catch (error) {
    console.error("❌ Monthly generation failed:", error);
  }
  
  console.log("========== ✅ MONTHLY JOB COMPLETED ==========\n");
}