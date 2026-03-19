import cron from "node-cron";
import { runDailyJob } from "./dailyJob.js";
import { runMonthlyJob } from "./monthlyJob.js";

// Daily at 1:00 AM - Marks overdue obligations
cron.schedule("0 1 * * *", async () => {
  console.log("\n🕐 CRON TRIGGERED: Daily Job - 1:00 AM");
  try {
    await runDailyJob();
  } catch (error) {
    console.error("❌ Daily job failed:", error);
  }
});

// Monthly: 1st day at 2:00 AM - Generates monthly/quarterly/annual obligations
cron.schedule("0 2 1 * *", async () => {
  console.log("\n🕑 CRON TRIGGERED: Monthly Job - 2:00 AM on 1st");
  try {
    await runMonthlyJob();
  } catch (error) {
    console.error("❌ Monthly job failed:", error);
  }
});

console.log("✅ Compliance Scheduler initialized");
console.log("   - Daily job: 1:00 AM (marks overdue)");
console.log("   - Monthly job: 2:00 AM on 1st (generates obligations)");