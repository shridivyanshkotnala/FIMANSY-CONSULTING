import { ComplianceObligation } from "../models/complianceObligationModel.js";
import { ReminderLog } from "../models/reminderLogModel.js";

export async function runReminderEngine() {
  const today = new Date();
  today.setHours(0,0,0,0);

  const reminderOffsets = [
    { days: 15, type: "15_day" },
    { days: 7, type: "7_day" },
    { days: 1, type: "1_day" }
  ];

  for (const offset of reminderOffsets) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + offset.days);

    const obligations = await ComplianceObligation.find({
      due_date: targetDate,
      is_completed: false,
      is_ignored: false
    });

    for (const obligation of obligations) {
      try {
        await ReminderLog.create({
          obligation_id: obligation._id,
          reminder_type: offset.type
        });

        // TODO:
        // sendEmail()
        // createNotification()
        // updateDashboardBadge()

      } catch (err) {
        // duplicate reminder ignored
      }
    }
  }
}