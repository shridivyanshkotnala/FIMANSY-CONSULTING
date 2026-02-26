import {ReceivableLedger} from "../../models/ledger/receivableLedgerModel.js";
export const getAgingSummary = async (organizationId) => {
  const today = new Date();

  const invoices = await ReceivableLedger.find({
    organizationId,
    balanceAmount: { $gt: 0 },
    status: { $in: ["open", "partially_paid","draft"] }
  }).lean();

  const bucket = {
    bucket_0_30: [],
    bucket_30_45: [],
    bucket_46_plus: [],
    requiringAction: []
  };

  for (const inv of invoices) {
    if (!inv.dueDate) continue;

    const daysPastDue = Math.floor(
      (today - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24)
    );

    // Skip invoices not yet due
    if (daysPastDue < 0) continue;

    const enriched = {
      invoiceId: inv.invoiceId,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      balanceAmount: inv.balanceAmount,
      dueDate: inv.dueDate,
      daysPastDue
    };

    if (daysPastDue < 30) {
      bucket.bucket_0_30.push(enriched);
    }
    else if (daysPastDue <= 45) {
      bucket.bucket_30_45.push(enriched);
      bucket.requiringAction.push(enriched);
    }
    else {
      bucket.bucket_46_plus.push(enriched);
      bucket.requiringAction.push(enriched);
    }
  }

  return bucket;
};
