import { RawZohoInvoice } from "../../models/raw/rawZohoInvoiceModel.js";
import { RawZohoPayment } from "../../models/raw/rawZohoPaymentModel.js";
import { ReceivableLedger } from "../../models/ledger/receivableLedgerModel.js";
import { ZohoConnection } from "../../models/zohoConnectionModel.js";

export const rebuildReceivableLedgerForOrg = async (organizationId) => {

  // Find the Zoho connection for this organization — raw records are stored per connection
  const connection = await ZohoConnection.findOne({ organizationId }).lean();
  if (!connection) return;

  const invoices = await RawZohoInvoice.find({ connectionId: connection._id }).lean();
  const payments = await RawZohoPayment.find({ connectionId: connection._id }).lean();

  // group payments by invoiceId (payments store applied amounts per invoice)
  const paymentMap = {};

  for (const p of payments) {
    const lines = p.invoices || [];
    for (const l of lines) {
      const id = l.invoiceId || l.invoice_id;
      const amt = l.amountApplied || l.amount_applied || 0;
      if (!paymentMap[id]) paymentMap[id] = 0;
      paymentMap[id] += amt;
    }
  }

  for (const inv of invoices) {

    const paidAmount = paymentMap[inv.invoiceId] || 0;
    // prefer explicit balance if present, otherwise compute from total
    const balanceAmount = typeof inv.balance === 'number' ? inv.balance : (inv.total || 0) - paidAmount;

    // default status from amounts
    let status = "open";
    if (balanceAmount <= 0) status = "paid";
    else if (paidAmount > 0) status = "partially_paid";

    // If Zoho provided a status, map it to our ledger values (keep computed as fallback)
    const rawStatus = (inv.status || inv.status)?.toString().toLowerCase();
    if (rawStatus) {
      if (rawStatus === "draft") status = "draft";
      else if (rawStatus === "partially_paid") status = "partially_paid";
      else if (rawStatus === "paid") status = "paid";
      else if (rawStatus === "void") status = "void";
      else if (rawStatus === "sent" || rawStatus === "sent_to_customer" || rawStatus === "open") status = "open";
    }

    await ReceivableLedger.findOneAndUpdate(
      {
        organizationId,
        invoiceId: inv.invoiceId
      },
      {
        organizationId,
        invoiceId: inv.invoiceId,
        customerId: inv.customerId || inv.customer_id || null,
        customerName: inv.customerName || inv.customer_name || inv.customerId || inv.customer_id || null,
        invoiceNumber: inv.invoiceNumber || inv.invoice_number || null,
        invoiceDate: inv.invoiceDate || inv.invoice_date || null,
        dueDate: inv.dueDate || inv.due_date || null,
        totalAmount: inv.total || inv.totalAmount || 0,
        paidAmount,
        balanceAmount,
        status,
        lastSyncedAt: new Date()
      },
      { upsert: true }
    );
  }
};
