// server/src/services/complianceScheduler/dailyJob.js
import { ComplianceObligation } from "../../models/compliance/complianceObligationModel.js";

export async function runDailyJob() {
  console.log(`\n========== 📅 RUNNING DAILY JOB: ${new Date().toISOString()} ==========`);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Mark overdue obligations (not filed and due date passed)
  const result = await ComplianceObligation.updateMany(
    {
      due_date: { $lt: today },
      status: { $nin: ["filed", "overdue"] } // Not filed and not already overdue
    },
    {
      $set: { status: "overdue" }
    }
  );
  
  console.log(`✅ Marked ${result.modifiedCount} obligations as overdue`);
  
  // Optional: Send reminders for upcoming deadlines
  const reminderDate = new Date(today);
  reminderDate.setDate(today.getDate() + 7); // 7 days from now
  
  const upcomingCount = await ComplianceObligation.countDocuments({
    due_date: { 
      $gte: today, 
      $lte: reminderDate 
    },
    status: { $nin: ["filed", "overdue"] }
  });
  
  console.log(`📧 ${upcomingCount} obligations due in next 7 days`);
  console.log("========== ✅ DAILY JOB COMPLETED ==========\n");
  
  return result.modifiedCount;
}