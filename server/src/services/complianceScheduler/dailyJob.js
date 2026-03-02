import { markOverdueObligations } from "../overdueService.js";
import { runReminderEngine } from "../reminderService.js";

export async function runDailyJob() {
  const overdueCount = await markOverdueObligations();
  console.log("Marked overdue:", overdueCount);

  await runReminderEngine();
}