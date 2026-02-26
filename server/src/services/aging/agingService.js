import { ReceivableLedger } from "../../models/ledger/receivableLedgerModel.js";

export const getAgingInvoices = async (organizationId, includeAll = false) => {

  const today = new Date();

  const query = { organizationId };

  if (!includeAll) {
    // legacy behavior: only open/partially_paid with outstanding balance
    query.status = { $in: ["open", "partially_paid"] };
    query.balanceAmount = { $gt: 0 };
  }

  const invoices = await ReceivableLedger.find(query).lean();

  return invoices.map(inv => {

    const daysOutstanding = inv.dueDate
      ? Math.floor((today - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24))
      : 0;

    let alertLevel = "soft";

    if (daysOutstanding > 45) alertLevel = "legal";
    else if (daysOutstanding > 30) alertLevel = "firm";

    const total = inv.totalAmount ?? 0;
    const balance = inv.balanceAmount ?? 0;
    const paid = Math.max(0, total - balance);

    return {
      id: inv.invoiceId,
      invoice_number: inv.invoiceNumber,
      vendor_name: inv.customerName,
      invoice_date: inv.invoiceDate,
      due_date: inv.dueDate,
      total_with_gst: total,
      paid_amount: paid,
      balance_amount: balance,
      status: inv.status ?? "unknown",
      daysOutstanding,
      alertLevel,
    };

  });
};
