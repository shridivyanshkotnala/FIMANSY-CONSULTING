import mongoose from "mongoose";

const reminderLogSchema = new mongoose.Schema({
  obligation_id: { type: mongoose.Schema.Types.ObjectId, ref: "ComplianceObligation" },
  reminder_type: { type: String, enum: ["15_day", "7_day", "1_day"] },
  sent_at: { type: Date, default: Date.now }
});

reminderLogSchema.index(
  { obligation_id: 1, reminder_type: 1 },
  { unique: true }
);

export const ReminderLog = mongoose.model("ReminderLog", reminderLogSchema);