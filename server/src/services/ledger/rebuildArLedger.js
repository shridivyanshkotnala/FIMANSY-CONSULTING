import { RawZohoInvoice } from "../../models/raw/rawZohoInvoiceModel.js";
import { RawZohoPayment } from "../../models/raw/rawZohoPaymentModel.js";
import { RawZohoCredit } from "../../models/raw/rawZohoCreditModel.js";
import { ARLedger } from "../../models/ledger/arLedgerModel.js";

export const rebuildARLedger = async (organizationId, connectionId) => {

  const invoices = await RawZohoInvoice.find({ connectionId });
  const payments = await RawZohoPayment.find({ connectionId });
  const credits = await RawZohoCredit.find({ connectionId });

  const paymentMap = {};
  const creditMap = {};

  // Map payments to invoices
  for (const payment of payments) {
    // support both { payload: { invoices: [{ invoice_id, amount }] } }
    // and flattened payments where `invoices` is [{ invoiceId, amountApplied }]
    const appliedFromPayload = payment.payload?.invoices || [];
    const appliedFromFlat = payment.invoices || [];

    if (appliedFromPayload.length) {
      for (const inv of appliedFromPayload) {
        const id = inv.invoice_id;
        const amount = inv.amount || 0;
        paymentMap[id] = (paymentMap[id] || 0) + amount;
      }
    } else {
      for (const inv of appliedFromFlat) {
        const id = inv.invoiceId;
        const amount = inv.amountApplied || inv.amount || 0;
        if (!id) continue;
        paymentMap[id] = (paymentMap[id] || 0) + amount;
      }
    }
  }

  // Map credits to invoices
  for (const credit of credits) {
    // credits may carry payload or follow a different flattened shape
    const applied = credit.payload?.invoices || credit.invoices || [];

    for (const inv of applied) {
      // support invoice_id or invoiceId
      const id = inv.invoice_id || inv.invoiceId || inv.invoiceIdString;
      const amount = inv.amount || inv.amountApplied || 0;
      if (!id) continue;
      creditMap[id] = (creditMap[id] || 0) + amount;
    }
  }

  // Track all active invoice IDs
  const activeInvoiceIds = new Set();

  for (const invoiceRaw of invoices) {
    // Normalize invoice shape: some raw documents store full payload,
    // others are flattened with top-level fields.
    const inv = invoiceRaw.payload
      ? invoiceRaw.payload
      : {
          invoice_id: invoiceRaw.invoiceId || invoiceRaw.invoiceIdString,
          customer_id: invoiceRaw.customerId || invoiceRaw.customer_id,
          customer_name: invoiceRaw.customerName || invoiceRaw.customer_name,
          date: invoiceRaw.invoiceDate || invoiceRaw.date || invoiceRaw.invoice_date,
          due_date: invoiceRaw.dueDate || invoiceRaw.due_date,
          total: invoiceRaw.total || invoiceRaw.balance || 0,
          exchange_rate: invoiceRaw.exchange_rate || invoiceRaw.exchangeRate || 1,
          currency_code: invoiceRaw.currencyCode || invoiceRaw.currency_code,
          status: invoiceRaw.status
        };

    // Skip documents with missing normalized invoice id
    if (!inv || !inv.invoice_id) continue;

    // Skip void / deleted invoices from Zoho
    if (inv.status === "void" || inv.status === "deleted") {
      continue;
    }

    activeInvoiceIds.add(inv.invoice_id);

    const originalAmount = inv.total || 0;

    const totalPaid = paymentMap[inv.invoice_id] || 0;
    const totalCreditApplied = creditMap[inv.invoice_id] || 0;

    // Clamp negative balances
    let currentBalance =
      originalAmount - totalPaid - totalCreditApplied;

    currentBalance = Math.max(currentBalance, 0);

    // Currency normalization
    const exchangeRate = inv.exchange_rate || 1;

    const baseOriginalAmount = originalAmount * exchangeRate;
    const baseBalance = currentBalance * exchangeRate;

    const today = new Date();
    const dueDate = new Date(inv.due_date);
    const agingDays =
      currentBalance > 0
        ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24))
        : 0;

    let status = "open";

    if (currentBalance <= 0) status = "paid";
    else if (agingDays > 0) status = "overdue";
    else if (totalPaid > 0 || totalCreditApplied > 0) status = "partial";

    await ARLedger.findOneAndUpdate(
      {
        organizationId,
        zohoInvoiceId: inv.invoice_id
      },
      {
        organizationId,
        connectionId,
        zohoInvoiceId: inv.invoice_id,
        customerId: inv.customer_id,
        customerName: inv.customer_name,
        invoiceDate: new Date(inv.date),
        dueDate,
        originalAmount,
        totalPaid,
        totalCreditApplied,
        currentBalance,
        baseCurrencyAmount: baseBalance,
        status,
        agingDays,
        currencyCode: inv.currency_code,
        exchangeRate,
        isDeleted: false,
        lastSyncedAt: new Date()
      },
      { upsert: true }
    );
  }

  // 1️⃣ Handle deleted invoices (critical)
  // Any ledger invoice not in activeInvoiceIds → mark deleted

  await ARLedger.updateMany(
    {
      organizationId,
      zohoInvoiceId: { $nin: Array.from(activeInvoiceIds) }
    },
    {
      $set: {
        isDeleted: true,
        currentBalance: 0,
        baseCurrencyAmount: 0
      }
    }
  );

  console.log("AR Ledger rebuilt safely with deletion + currency normalization");
};