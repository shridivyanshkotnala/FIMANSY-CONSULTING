import { ComplianceObligation } from "../models/complianceObligationModel.js";

export async function markOverdueObligations() {
  const today = new Date();
  today.setHours(0,0,0,0);

  const result = await ComplianceObligation.updateMany(
    {
      due_date: { $lt: today },
      is_completed: false,
      is_ignored: false,
      is_overdue: false
    },
    {
      $set: { is_overdue: true }
    }
  );

  return result.modifiedCount;
}