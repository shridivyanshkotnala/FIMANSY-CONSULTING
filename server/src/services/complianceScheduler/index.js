import cron from "node-cron";
import { runDailyJob } from "./dailyJob.js";
import { runMonthlyJob } from "./monthlyJob.js";

// Daily at 1:00 AM
cron.schedule("0 1 * * *", async () => {
  console.log("Running daily job...");
  await runDailyJob();
});

// Monthly: 1st day at 2:00 AM
cron.schedule("0 2 1 * *", async () => {
  console.log("Running monthly job...");
  await runMonthlyJob();
});